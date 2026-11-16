import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { publicEnv } from '@/lib/env';

/**
 * URL a la que Supabase devuelve a la persona después de OAuth o de un enlace por correo.
 * Tiene que figurar en la lista de "Redirect URLs" del proyecto (docs/setup/SUPABASE.md §3).
 */
export function authRedirectUrl(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return Linking.createURL(path);
}

/**
 * Destino del enlace de confirmación del correo. Desde el teléfono se usa la web pública (si está
 * configurada): el enlace se abre en el navegador del mail, donde un crecerencasa:// o exp:// no
 * carga y quedaba una pantalla en blanco. La web confirma y ofrece ingresar.
 */
export function emailRedirectUrl(path: string): string {
  if (Platform.OS !== 'web' && publicEnv.EXPO_PUBLIC_WEB_URL) {
    return `${publicEnv.EXPO_PUBLIC_WEB_URL.replace(/\/$/, '')}${path}`;
  }
  return authRedirectUrl(path);
}

/** Solo se permiten destinos internos después del ingreso (evita redirecciones abiertas). */
export function safeNextPath(next: unknown, fallback = '/hoy'): string {
  if (typeof next !== 'string') return fallback;
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}
