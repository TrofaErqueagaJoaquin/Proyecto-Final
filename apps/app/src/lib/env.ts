import { AppEnvSchema } from '@crecer/shared';
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
