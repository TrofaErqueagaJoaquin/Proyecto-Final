/**
 * Edad de un integrante a partir de su mes de nacimiento.
 *
 * Por minimización de datos solo se guarda el mes y el año (DATABASE.md §4), así que la edad
 * se calcula en meses calendario completos: alcanza para elegir pautas por edad, que la OMS
 * y la SAP definen por años o por rangos de meses.
 */

const BIRTH_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])(?:-01)?$/;

/**
 * @param birthMonth `AAAA-MM` o `AAAA-MM-01` (como lo devuelve la columna `date` de Postgres)
 * @param now reloj inyectado para que el resultado sea reproducible en los tests
 */
export function ageInMonths(birthMonth: string, now: Date): number {
  const match = BIRTH_MONTH_PATTERN.exec(birthMonth);
  if (!match) {
    throw new RangeError(`Mes de nacimiento inválido: "${birthMonth}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const months = (now.getUTCFullYear() - year) * 12 + (now.getUTCMonth() + 1 - month);
  if (months < 0) {
    throw new RangeError('El mes de nacimiento no puede ser posterior a la fecha actual');
  }
  return months;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${String(count)} ${count === 1 ? singular : pluralForm}`;
}

/** Texto para la interfaz: "8 meses", "1 año", "4 años y 2 meses". */
export function formatAge(totalMonths: number): string {
  if (!Number.isInteger(totalMonths) || totalMonths < 0) {
    throw new RangeError(`Edad en meses inválida: ${String(totalMonths)}`);
  }
  if (totalMonths === 0) {
    return 'menos de 1 mes';
  }
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) {
    return plural(months, 'mes', 'meses');
  }
  const yearsText = plural(years, 'año', 'años');
  return months === 0 ? yearsText : `${yearsText} y ${plural(months, 'mes', 'meses')}`;
}
