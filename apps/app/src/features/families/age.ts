/**
 * Mes de nacimiento aproximado a partir de los años cumplidos (la bienvenida pregunta solo "¿cuántos
 * años tiene?"). Se toma la mitad de ese año: con 4 años, 4 años y 6 meses atrás. Con 0, 6 meses
 * atrás. Devuelve el primer día del mes (AAAA-MM-01), como guarda la base.
 */
export function birthMonthFromAge(years: number, now: Date = new Date()): string {
  const monthsBack = years * 12 + 6;
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthsBack, 1));
  return `${String(date.getUTCFullYear())}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** Opciones de edad de la bienvenida: "Menos de 1" y de 1 a 17 años. */
export const AGE_OPTIONS = Array.from({ length: 18 }, (_, years) => ({
  value: String(years),
  label: years === 0 ? 'Menos de 1' : String(years),
}));
