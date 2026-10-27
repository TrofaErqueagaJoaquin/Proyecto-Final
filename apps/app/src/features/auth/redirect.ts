import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

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

/** Solo se permiten destinos internos después del ingreso (evita redirecciones abiertas). */
export function safeNextPath(next: unknown, fallback = '/hoy'): string {
  if (typeof next !== 'string') return fallback;
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}
