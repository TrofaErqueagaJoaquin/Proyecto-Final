import { createClient } from '@supabase/supabase-js';

import type { Env } from '../env';

const serverAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

// Sin tipos generados todavía (pnpm db:types): todo resultado se valida con zod antes de usarse.

/**
 * Cliente que actúa COMO la persona usuaria: Supabase recibe su JWT y RLS decide qué puede
 * leer o escribir. Es el cliente por defecto de la API (ADR-006).
 */
export function createUserClient(env: Env, accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: serverAuthOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Cliente con la clave secreta: saltea RLS. Solo se usa para RPC privilegiadas que la base
 * restringe a service_role, siempre después de verificar permisos con el cliente del usuario.
 */
export function createServiceClient(env: Env) {
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error('Falta SUPABASE_SECRET_KEY: esta operación requiere la clave secreta.');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: serverAuthOptions });
}
