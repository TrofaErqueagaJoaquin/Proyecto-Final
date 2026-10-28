/**
 * Generador de planes semanales por reglas (IMPLEMENTATION_PLAN.md F7). Puro y determinista:
 * las mismas entradas dan el mismo plan (el desempate usa un hash del id y la semana).
 *
 * Restricciones (se cumplen en el 100% de los casos, ver generator.test.ts):
 *  - edad: la actividad sirve para la edad (o para alguno de los integrantes en un plan familiar);
 *  - tiempo: dura lo que la familia tiene por día como mucho;
 *  - espacio y presupuesto: según las preferencias;
 *  - de 5 a 7 ítems por semana, ninguna actividad más de 2 veces;
 *  - siempre al menos una opción de 10 minutos o menos y sin materiales.
 */

export type Space = 'small_indoor' | 'indoor' | 'outdoor';
export type Budget = 'free' | 'low' | 'medium';

export interface PlanActivity {
  id: string;
  title: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  durationMin: number;
  costLevel: Budget;
  space: Space;
  materialsCount: number;
  categories: string[];
}

export interface PlanPreferences {
  minutesPerDay: number | null;
  space: Space | null;
  budget: Budget | null;
  interests: string[];
}

export interface PlanInput {
  /** Lunes de la semana (YYYY-MM-DD). */
  weekStart: string;
  /** Edades en meses: una (plan de un integrante) o varias (plan de la familia). */
  agesMonths: number[];
  preferences: PlanPreferences;
  activities: PlanActivity[];
  /** Actividades recomendadas por la última evaluación, en orden de prioridad. */
  recommendedActivityIds: string[];
  /** Actividades hechas hace poco (para variar). */
  recentlyDoneIds: string[];
}

export type PlanReason = 'recommended' | 'interest' | 'variety' | 'quick';

export interface PlanItem {
  activityId: string;
  /** YYYY-MM-DD. */
  scheduledFor: string;
  reason: PlanReason;
}

export const PLAN_GENERATOR_VERSION = 'plans.v1';
export const QUICK_MINUTES = 10;

const SPACE_ALLOWED: Record<Space, Space[]> = {
  small_indoor: ['small_indoor'],
  indoor: ['small_indoor', 'indoor'],
  outdoor: ['small_indoor', 'indoor', 'outdoor'],
};
const BUDGET_ALLOWED: Record<Budget, Budget[]> = {
  free: ['free'],
  low: ['free', 'low'],
  medium: ['free', 'low', 'medium'],
};

/** Qué tipos de actividad suelen gustar según cada interés del catálogo (orientativo). */
const INTEREST_CATEGORIES: Record<string, string[]> = {
  arte: ['creatividad'],
  musica: ['creatividad', 'movimiento'],
  deporte: ['movimiento'],
  naturaleza: ['exploracion'],
  lectura: ['lenguaje', 'vinculo'],
  cocina: ['autonomia', 'vinculo'],
  construccion: ['creatividad', 'exploracion'],
  animales: ['exploracion'],
  juegos_mesa: ['juego_social'],
  baile: ['movimiento'],
  ciencia: ['exploracion'],
  disfraces: ['creatividad', 'juego_social'],
};

export function isQuick(a: PlanActivity): boolean {
  return a.durationMin <= QUICK_MINUTES && a.materialsCount === 0;
}

function fitsAge(a: PlanActivity, ages: number[]): boolean {
  return ages.length === 0 || ages.some((age) => age >= a.ageMinMonths && age <= a.ageMaxMonths);
}

/** ¿La actividad cumple las restricciones? (edad, tiempo, espacio, presupuesto). */
export function isEligible(a: PlanActivity, input: Pick<PlanInput, 'agesMonths' | 'preferences'>) {
  const p = input.preferences;
  return (
    fitsAge(a, input.agesMonths) &&
    (p.minutesPerDay === null || a.durationMin <= Math.max(p.minutesPerDay, QUICK_MINUTES)) &&
    (p.space === null || SPACE_ALLOWED[p.space].includes(a.space)) &&
    (p.budget === null || BUDGET_ALLOWED[p.budget].includes(a.costLevel))
  );
}

/** Cantidad de ítems según el tiempo disponible: 5 con poco tiempo, 7 con media hora o más. */
export function itemCount(minutesPerDay: number | null): number {
  if (minutesPerDay !== null && minutesPerDay <= QUICK_MINUTES) return 5;
  if (minutesPerDay !== null && minutesPerDay >= 30) return 7;
  return 6;
}

/** Hash FNV-1a: desempate estable entre corridas. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de una fecha (YYYY-MM-DD). */
export function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(isoDate, -offset);
}

interface Scored {
  activity: PlanActivity;
  base: number;
  reason: PlanReason;
}

function scoreAll(input: PlanInput, eligible: PlanActivity[]): Scored[] {
  const interestCategories = new Set(
    input.preferences.interests.flatMap((i) => INTEREST_CATEGORIES[i] ?? []),
  );
  const recommended = new Map(input.recommendedActivityIds.map((id, i) => [id, i]));
  const recent = new Set(input.recentlyDoneIds);
  return eligible.map((activity) => {
    const rank = recommended.get(activity.id);
    const interest = activity.categories.some((c) => interestCategories.has(c));
    let base = hash(`${activity.id}:${input.weekStart}`);
    let reason: PlanReason = 'variety';
    if (rank !== undefined) {
      base += 10 - Math.min(rank, 5);
      reason = 'recommended';
    } else if (interest) {
      base += 3;
      reason = 'interest';
    }
    if (recent.has(activity.id)) base -= 2;
    return { activity, base, reason };
  });
}

/** Elige la siguiente actividad: mejor puntaje, penalizando tipos ya usados y repeticiones. */
function pickNext(scored: Scored[], chosen: PlanActivity[]): Scored | null {
  const usedCategories = new Map<string, number>();
  for (const a of chosen) {
    for (const c of a.categories) usedCategories.set(c, (usedCategories.get(c) ?? 0) + 1);
  }
  let best: { item: Scored; score: number } | null = null;
  for (const item of scored) {
    const times = chosen.filter((a) => a.id === item.activity.id).length;
    if (times >= 2) continue;
    const repetition = times * 20;
    const categoryPenalty = item.activity.categories.reduce(
      (sum, c) => sum + (usedCategories.get(c) ?? 0) * 1.5,
      0,
    );
    const score = item.base - repetition - categoryPenalty;
    if (!best || score > best.score) best = { item, score };
  }
  return best?.item ?? null;
}

/** Días de la semana repartidos (0 = lunes). 5 → lun, mar, jue, vie, dom. */
export function spreadDays(count: number): number[] {
  return Array.from({ length: count }, (_, i) => Math.round((i * 6) / Math.max(1, count - 1)));
}

export function generatePlan(input: PlanInput): PlanItem[] {
  const eligible = input.activities.filter((a) => isEligible(a, input));
  if (eligible.length === 0) return [];
  const scored = scoreAll(input, eligible);
  // Con un catálogo chico, cada actividad entra hasta 2 veces.
  const count = Math.min(itemCount(input.preferences.minutesPerDay), eligible.length * 2);

  const chosen: Scored[] = [];
  while (chosen.length < count) {
    const next = pickNext(
      scored,
      chosen.map((c) => c.activity),
    );
    if (!next) break;
    chosen.push(next);
  }

  // Siempre una opción de 10 minutos sin materiales (si el catálogo tiene alguna que cumpla).
  if (!chosen.some((c) => isQuick(c.activity))) {
    const quick = scored.filter((s) => isQuick(s.activity)).sort((a, b) => b.base - a.base)[0];
    if (quick) {
      // Se reemplaza la de menor puntaje que no sea recomendada (o la última).
      const replaceAt = [...chosen.keys()]
        .reverse()
        .find((i) => chosen[i]?.reason !== 'recommended');
      chosen[replaceAt ?? chosen.length - 1] = { ...quick, reason: 'quick' };
    }
  }

  const days = spreadDays(chosen.length);
  return chosen.map((c, i) => ({
    activityId: c.activity.id,
    scheduledFor: addDays(input.weekStart, days[i] ?? i),
    reason: isQuick(c.activity) && c.reason === 'variety' ? 'quick' : c.reason,
  }));
}

/**
 * "Otra idea": la mejor alternativa para un ítem, que cumpla las restricciones y no esté ya en
 * el plan ni sea la que se quiere cambiar. null si no hay ninguna.
 */
export function alternativeFor(
  input: PlanInput,
  plan: Pick<PlanItem, 'activityId'>[],
  replacingActivityId: string,
): string | null {
  const inPlan = new Set(plan.map((p) => p.activityId));
  const scored = scoreAll(
    input,
    input.activities.filter((a) => isEligible(a, input)),
  ).filter((s) => !inPlan.has(s.activity.id) && s.activity.id !== replacingActivityId);
  scored.sort((a, b) => b.base - a.base);
  return scored[0]?.activity.id ?? null;
}
