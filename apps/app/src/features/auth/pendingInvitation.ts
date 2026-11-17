import { useEffect, useState } from 'react';

import { storage } from '@/lib/storage';

import { safeNextPath } from './redirect';

/**
 * Invitación pendiente: quien abre el enlace de una invitación sin cuenta pasa por ingresar,
 * registrarse, el correo de confirmación (o Google) y la bienvenida. El destino viaja en `next`
 * por todo el camino; esto es el respaldo para cuando se corta (por ejemplo, el enlace del correo
 * se abre sin `next` o el ingreso con Google en el celular vuelve sin él).
 */
const KEY = 'crecer.invitacionPendiente';
/** Las invitaciones vencen a los 7 días: después de eso el respaldo ya no sirve. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** ¿El destino es aceptar una invitación a una familia? */
export function isInvitationPath(next: unknown): next is string {
  return typeof next === 'string' && /^\/invitacion(\?|$)/.test(next);
}

/** Agrega `next` a una ruta solo si es un destino interno (y no el de siempre). */
export function withNext(path: string, next: unknown): string {
  const target = safeNextPath(next, '');
  if (!target) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}next=${encodeURIComponent(target)}`;
}

/** Guarda la invitación (si `next` es una) para retomarla después del alta. */
export async function rememberInvitation(next: unknown): Promise<void> {
  if (!isInvitationPath(next)) return;
  try {
    await storage.setItem(KEY, JSON.stringify({ path: next, at: Date.now() }));
  } catch {
    // Sin almacenamiento (modo privado): queda solo `next` en la dirección.
  }
}

/** Devuelve la invitación guardada, si hay una vigente. */
export async function readPendingInvitation(): Promise<string | null> {
  try {
    const raw = await storage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { path?: unknown; at?: unknown };
    const fresh = typeof value.at === 'number' && Date.now() - value.at < MAX_AGE_MS;
    if (fresh && isInvitationPath(value.path)) return value.path;
    await storage.removeItem(KEY);
    return null;
  } catch {
    return null;
  }
}

/** Olvida la invitación guardada (ya se aceptó, se descartó o el enlace no sirve). */
export async function clearPendingInvitation(): Promise<void> {
  try {
    await storage.removeItem(KEY);
  } catch {
    // Nada que hacer: el respaldo vence solo.
  }
}

/** Lee la invitación guardada una vez. `ready` es falso mientras se lee. */
export function usePendingInvitation(): { ready: boolean; path: string | null } {
  const [state, setState] = useState<{ ready: boolean; path: string | null }>({
    ready: false,
    path: null,
  });
  useEffect(() => {
    let active = true;
    void readPendingInvitation().then((path) => {
      if (active) setState({ ready: true, path });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
