import { AppEnvSchema } from '@crecer/shared';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

const PublicEnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: AppEnvSchema.default('local'),
  EXPO_PUBLIC_API_URL: z.url().default('http://localhost:8787'),
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  // Clave publicable de Supabase: pública por diseño (los datos los protege RLS).
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Expo solo inyecta las variables EXPO_PUBLIC_* cuando se leen de forma estática
// (process.env.EXPO_PUBLIC_X), por eso se listan una por una.
export const publicEnv = PublicEnvSchema.parse({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

/**
 * URL de la API. En desarrollo, en un teléfono (Expo Go), "localhost" es el propio teléfono: se
 * reemplaza por la IP de la compu que sirve la app (la misma que usa Expo para el paquete).
 */
function resolveApiUrl(configured: string): string {
  const url = new URL(configured);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!isLocal || Platform.OS === 'web' || !devHost) return configured.replace(/\/$/, '');
  url.hostname = devHost;
  return url.toString().replace(/\/$/, '');
}

export const apiBaseUrl = resolveApiUrl(publicEnv.EXPO_PUBLIC_API_URL);
