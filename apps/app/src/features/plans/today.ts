/** Lo mínimo de un ítem del plan para decidir qué se muestra en Hoy. */
export interface TodayItem {
  scheduled_for: string;
  status: string;
}

/**
 * Qué muestra "Hoy" (rediseño de 2026):
 * - `forToday`: la idea asignada a hoy; si hoy no tiene nada (el plan reparte de lunes a domingo) y
 *   todavía no hicieron nada, la primera pendiente, para poder arrancar en el momento.
 * - `doneToday`: si ya registraron algo hoy (por el plan o por el registro de actividades).
 * - `next`: la próxima pendiente de un día que viene.
 */
export function pickToday<T extends { item: TodayItem }>(
  entries: readonly T[],
  today: string,
  loggedToday: boolean,
): { forToday: T | undefined; doneToday: boolean; next: T | undefined } {
  const sorted = [...entries].sort((a, b) =>
    a.item.scheduled_for.localeCompare(b.item.scheduled_for),
  );
  const doneToday =
    loggedToday || sorted.some((e) => e.item.scheduled_for === today && e.item.status === 'done');
  const forToday =
    sorted.find((e) => e.item.scheduled_for === today && e.item.status === 'planned') ??
    (doneToday ? undefined : sorted.find((e) => e.item.status === 'planned'));
  const next = sorted.find((e) => e.item.scheduled_for > today && e.item.status === 'planned');
  return { forToday, doneToday, next };
}
