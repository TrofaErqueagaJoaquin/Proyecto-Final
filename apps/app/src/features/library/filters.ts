import { AGE_STAGES } from '@crecer/shared';

export interface ActivityFilters {
  stage: (typeof AGE_STAGES)[number]['slug'] | null;
  maxMinutes: 10 | 20 | 30 | null;
  space: 'small_indoor' | 'indoor' | 'outdoor' | null;
  freeOnly: boolean;
  noMaterials: boolean;
  category: string | null;
  query: string;
}

export const EMPTY_FILTERS: ActivityFilters = {
  stage: null,
  maxMinutes: null,
  space: null,
  freeOnly: false,
  noMaterials: false,
  category: null,
  query: '',
};

export interface FilterableActivity {
  title: string;
  summary: string;
  objective: string;
  age_min_months: number;
  age_max_months: number;
  duration_min: number;
  cost_level: string;
  space: string;
  materials: string[];
  categories: string[];
}

// Marcas diacríticas combinantes (tildes, diéresis) que quedan separadas después de NFD.
const COMBINING_MARKS = new RegExp('[\u0300-\u036f]', 'g');

/** Minúsculas y sin tildes: "Reacción" coincide con "reaccion". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim();
}

// Qué espacios sirven para cada respuesta: lo que entra en un espacio chico también entra adentro.
const SPACE_FITS: Record<NonNullable<ActivityFilters['space']>, string[]> = {
  small_indoor: ['small_indoor'],
  indoor: ['small_indoor', 'indoor'],
  outdoor: ['outdoor'],
};

export function matchesFilters(activity: FilterableActivity, filters: ActivityFilters): boolean {
  if (filters.stage) {
    const stage = AGE_STAGES.find((s) => s.slug === filters.stage);
    if (
      stage &&
      (activity.age_min_months > stage.maxMonths || activity.age_max_months < stage.minMonths)
    ) {
      return false;
    }
  }
  if (filters.maxMinutes !== null && activity.duration_min > filters.maxMinutes) return false;
  if (filters.space && !SPACE_FITS[filters.space].includes(activity.space)) return false;
  if (filters.freeOnly && activity.cost_level !== 'free') return false;
  if (filters.noMaterials && activity.materials.length > 0) return false;
  if (filters.category && !activity.categories.includes(filters.category)) return false;
  if (filters.query.trim() !== '') {
    const haystack = normalize(`${activity.title} ${activity.summary} ${activity.objective}`);
    const words = normalize(filters.query).split(/\s+/);
    if (!words.every((word) => haystack.includes(word))) return false;
  }
  return true;
}

export function activeFilterCount(filters: ActivityFilters): number {
  return [
    filters.stage !== null,
    filters.maxMinutes !== null,
    filters.space !== null,
    filters.freeOnly,
    filters.noMaterials,
    filters.category !== null,
    filters.query.trim() !== '',
  ].filter(Boolean).length;
}
