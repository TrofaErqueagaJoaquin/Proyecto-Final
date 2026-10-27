/**
 * Vocabulario que los resultados nunca usan: la evaluación orienta, no diagnostica
 * (IMPLEMENTATION_PLAN.md F6). Se comparan raíces sin tildes ni mayúsculas.
 *
 * El aviso fijo "Es una orientación, no un diagnóstico" queda fuera de este control a propósito:
 * se revisan los textos que describen al chico o a la familia.
 */
const CLINICAL_ROOTS = [
  'diagnos',
  'trastorno',
  'adiccion',
  'adicto',
  'patolog',
  'sintoma',
  'anormal',
  'deficit',
  'tdah',
  'autismo',
  'enfermedad',
  'tratamiento',
  'clinic',
  'grave',
  'severo',
  'dependencia',
] as const;

function normalize(text: string): string {
  return text.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase();
}

/** Raíces clínicas que aparecen en el texto (vacío si no hay ninguna). */
export function findClinicalTerms(text: string): string[] {
  const words = normalize(text).split(/[^a-z0-9]+/);
  return CLINICAL_ROOTS.filter((root) => words.some((word) => word.startsWith(root)));
}
