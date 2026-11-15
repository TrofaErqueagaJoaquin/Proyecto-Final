/**
 * Máscaras de entrada: dan formato mientras se escribe. Reciben el texto nuevo y el anterior
 * (para saber si se está borrando) y devuelven lo que se muestra.
 */
export type Mask = (next: string, previous: string) => string;

/**
 * Mes y año "MM/AAAA": solo números, la barra aparece sola después del mes y un mes de un dígito
 * mayor a 1 se completa con 0 ("4" → "04/"). Al borrar, la barra se va con el mes.
 */
export const monthYearMask: Mask = (next, previous) => {
  let digits = next.replace(/\D/g, '').slice(0, 6);
  if (/^[2-9]$/.test(digits)) digits = `0${digits}`;
  const deleting = next.length < previous.length;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 2 && !deleting) return `${digits}/`;
  return digits;
};

/** Solo números, hasta `max` dígitos (códigos, años de experiencia). */
export function digitsMask(max: number): Mask {
  return (next) => next.replace(/\D/g, '').slice(0, max);
}
