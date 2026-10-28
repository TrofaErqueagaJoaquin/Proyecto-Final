import { describe, expect, it } from 'vitest';

import {
  alternativeFor,
  generatePlan,
  isEligible,
  isQuick,
  itemCount,
  mondayOf,
  spreadDays,
  type Budget,
  type PlanActivity,
  type PlanInput,
  type Space,
} from './generator';

const CATEGORIES = [
  'movimiento',
  'creatividad',
  'lenguaje',
  'calma',
  'juego_social',
  'exploracion',
];
const SPACES: Space[] = ['small_indoor', 'indoor', 'outdoor'];
const BUDGETS: Budget[] = ['free', 'low', 'medium'];

/** Generador pseudoaleatorio con semilla (mulberry32): los casos se pueden reproducir. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)] as T;
}

function activity(id: string, overrides: Partial<PlanActivity> = {}): PlanActivity {
  return {
    id,
    title: id,
    ageMinMonths: 0,
    ageMaxMonths: 216,
    durationMin: 15,
    costLevel: 'free',
    space: 'small_indoor',
    materialsCount: 1,
    categories: ['movimiento'],
    ...overrides,
  };
}

function randomCatalog(r: () => number, size: number): PlanActivity[] {
  return Array.from({ length: size }, (_, i) => {
    const min = Math.floor(r() * 120);
    return activity(`a${String(i)}`, {
      ageMinMonths: min,
      ageMaxMonths: min + 24 + Math.floor(r() * 120),
      durationMin: pick(r, [5, 10, 15, 20, 30, 45]),
      costLevel: pick(r, BUDGETS),
      space: pick(r, SPACES),
      materialsCount: pick(r, [0, 0, 1, 2]),
      categories: [pick(r, CATEGORIES), ...(r() < 0.3 ? [pick(r, CATEGORIES)] : [])],
    });
  });
}

describe('generatePlan · restricciones en 300 casos con semilla', () => {
  const cases = Array.from({ length: 300 }, (_, seed) => {
    const r = rng(seed + 1);
    const catalog = randomCatalog(r, 8 + Math.floor(r() * 30));
    const input: PlanInput = {
      weekStart: '2026-11-02',
      agesMonths:
        r() < 0.3 ? [Math.floor(r() * 200), Math.floor(r() * 200)] : [Math.floor(r() * 200)],
      preferences: {
        minutesPerDay: pick(r, [null, 10, 20, 30, 60]),
        space: pick(r, [null, ...SPACES]),
        budget: pick(r, [null, ...BUDGETS]),
        interests: r() < 0.5 ? ['deporte', 'arte'] : [],
      },
      activities: catalog,
      recommendedActivityIds: catalog.slice(0, 3).map((a) => a.id),
      recentlyDoneIds: catalog.slice(3, 5).map((a) => a.id),
    };
    return [seed, input] as const;
  });

  it.each(cases)('caso %i', (_seed, input) => {
    const plan = generatePlan(input);
    const byId = new Map(input.activities.map((a) => [a.id, a]));
    const eligible = input.activities.filter((a) => isEligible(a, input));

    // Cada ítem cumple edad, tiempo, espacio y presupuesto.
    for (const item of plan) {
      const a = byId.get(item.activityId);
      expect(a && isEligible(a, input)).toBe(true);
    }
    // Ninguna actividad más de 2 veces.
    const counts = new Map<string, number>();
    for (const item of plan) counts.set(item.activityId, (counts.get(item.activityId) ?? 0) + 1);
    expect(Math.max(0, ...counts.values())).toBeLessThanOrEqual(2);
    // Entre 5 y 7 ítems, salvo que el catálogo apto no alcance.
    if (eligible.length >= 4) {
      expect(plan.length).toBeGreaterThanOrEqual(5);
      expect(plan.length).toBeLessThanOrEqual(7);
    }
    // Siempre una opción rápida, si el catálogo apto tiene alguna.
    if (eligible.some(isQuick)) {
      expect(plan.some((item) => isQuick(byId.get(item.activityId) as PlanActivity))).toBe(true);
    }
    // Todo dentro de la semana, sin dos ítems el mismo día.
    const days = plan.map((i) => i.scheduledFor);
    expect(new Set(days).size).toBe(days.length);
    for (const day of days) {
      expect(day >= '2026-11-02' && day <= '2026-11-08').toBe(true);
    }
  });
});

describe('generatePlan · prioridades', () => {
  const base: PlanInput = {
    weekStart: '2026-11-02',
    agesMonths: [48],
    preferences: { minutesPerDay: 20, space: null, budget: null, interests: [] },
    activities: [
      activity('rec', { categories: ['calma'] }),
      activity('rapida', { durationMin: 5, materialsCount: 0, categories: ['vinculo'] }),
      ...['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map((id, i) =>
        activity(id, { categories: [CATEGORIES[i % CATEGORIES.length] ?? 'movimiento'] }),
      ),
    ],
    recommendedActivityIds: ['rec'],
    recentlyDoneIds: [],
  };

  it('la recomendada va primero y con su motivo', () => {
    const plan = generatePlan(base);
    expect(plan[0]).toMatchObject({ activityId: 'rec', reason: 'recommended' });
  });

  it('es determinista', () => {
    expect(generatePlan(base)).toEqual(generatePlan(base));
  });

  it('incluye la opción de 10 minutos sin materiales', () => {
    expect(generatePlan(base).some((i) => i.activityId === 'rapida')).toBe(true);
  });

  it('respeta la edad: nada para bebés en un plan de un chico de 10 años', () => {
    const plan = generatePlan({
      ...base,
      agesMonths: [120],
      activities: [...base.activities, activity('bebe', { ageMinMonths: 0, ageMaxMonths: 24 })],
    });
    expect(plan.some((i) => i.activityId === 'bebe')).toBe(false);
  });

  it('sin catálogo apto, el plan queda vacío', () => {
    expect(generatePlan({ ...base, activities: [] })).toEqual([]);
  });
});

describe('alternativeFor', () => {
  it('propone una actividad que no está en el plan', () => {
    const input: PlanInput = {
      weekStart: '2026-11-02',
      agesMonths: [48],
      preferences: { minutesPerDay: null, space: null, budget: null, interests: [] },
      activities: ['a', 'b', 'c'].map((id) => activity(id)),
      recommendedActivityIds: [],
      recentlyDoneIds: [],
    };
    expect(alternativeFor(input, [{ activityId: 'a' }, { activityId: 'b' }], 'a')).toBe('c');
    expect(
      alternativeFor(input, [{ activityId: 'a' }, { activityId: 'b' }, { activityId: 'c' }], 'a'),
    ).toBeNull();
  });
});

describe('utilidades', () => {
  it.each([
    [10, 5],
    [20, 6],
    [null, 6],
    [30, 7],
    [60, 7],
  ] as const)('itemCount(%s) = %i', (minutes, count) => {
    expect(itemCount(minutes)).toBe(count);
  });

  it('reparte los días en la semana', () => {
    expect(spreadDays(5)).toEqual([0, 2, 3, 5, 6]);
    expect(spreadDays(7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('calcula el lunes de la semana', () => {
    expect(mondayOf('2026-10-28')).toBe('2026-10-26');
    expect(mondayOf('2026-11-01')).toBe('2026-10-26');
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
  });
});
