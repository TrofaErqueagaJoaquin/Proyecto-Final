/* eslint-disable no-console -- este módulo es el único punto de salida de logs */

type Level = 'info' | 'warn' | 'error';

/**
 * Logs estructurados en JSON (una línea por evento) para Vercel y Sentry.
 * Nunca se loguea contenido del usuario: solo identificadores, códigos y tiempos.
 */
export function log(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
