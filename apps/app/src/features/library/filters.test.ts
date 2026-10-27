import {
  activeFilterCount,
  EMPTY_FILTERS,
  matchesFilters,
  type FilterableActivity,
} from './filters';

const CIRCUITO: FilterableActivity = {
  title: 'Circuito en el living',
  summary: 'Un recorrido con almohadones.',
  objective: 'Equilibrio y coordinación.',
  age_min_months: 24,
  age_max_months: 72,
  duration_min: 15,
  cost_level: 'free',
  space: 'small_indoor',
  materials: ['Almohadones'],
  categories: ['movimiento'],
};

const PLAZA: FilterableActivity = {
  ...CIRCUITO,
  title: 'Búsqueda del tesoro en la plaza',
  age_min_months: 48,
  age_max_months: 132,
  duration_min: 30,
  space: 'outdoor',
  materials: [],
  categories: ['exploracion'],
};

describe('matchesFilters', () => {
  it('sin filtros, todo coincide', () => {
    expect(matchesFilters(CIRCUITO, EMPTY_FILTERS)).toBe(true);
  });

  it('filtra por etapa cuando el rango de edad se solapa', () => {
    expect(matchesFilters(CIRCUITO, { ...EMPTY_FILTERS, stage: 'etapa-3-5' })).toBe(true);
    expect(matchesFilters(CIRCUITO, { ...EMPTY_FILTERS, stage: 'etapa-9-11' })).toBe(false);
  });

  it('filtra por duración máxima', () => {
    expect(matchesFilters(CIRCUITO, { ...EMPTY_FILTERS, maxMinutes: 10 })).toBe(false);
    expect(matchesFilters(CIRCUITO, { ...EMPTY_FILTERS, maxMinutes: 20 })).toBe(true);
  });

  it('lo que entra en un espacio chico también sirve "adentro", pero no al aire libre', () => {
    expect(matchesFilters(CIRCUITO, { ...EMPTY_FILTERS, space: 'indoor' })).toBe(true);
    expect(matchesFilters(CIRCUITO, { ...EMPTY_FILTERS, space: 'outdoor' })).toBe(false);
    expect(matchesFilters(PLAZA, { ...EMPTY_FILTERS, space: 'small_indoor' })).toBe(false);
  });

  it('"sin materiales" excluye las que necesitan algo', () => {
    expect(matchesFilters(CIRCUITO, { ...EMPTY_FILTERS, noMaterials: true })).toBe(false);
    expect(matchesFilters(PLAZA, { ...EMPTY_FILTERS, noMaterials: true })).toBe(true);
  });

  it('busca sin distinguir tildes ni mayúsculas, y exige todas las palabras', () => {
    expect(matchesFilters(PLAZA, { ...EMPTY_FILTERS, query: 'busqueda PLAZA' })).toBe(true);
    expect(matchesFilters(PLAZA, { ...EMPTY_FILTERS, query: 'busqueda living' })).toBe(false);
  });

  it('filtra por categoría', () => {
    expect(matchesFilters(PLAZA, { ...EMPTY_FILTERS, category: 'movimiento' })).toBe(false);
  });
});

describe('activeFilterCount', () => {
  it('cuenta los filtros activos', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, freeOnly: true, query: 'a' })).toBe(2);
  });
});
