// Utilidades compartidas por demo:reset y demo:capture.

import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

import { type Database } from '@crecer/shared';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { checkGuards, CONFIRMATION_PHRASE, ENVIRONMENT_SETTING_KEY } from './guards.ts';

export type Db = SupabaseClient<Database>;

export const env = z
  .object({
    APP_ENV: z.string().optional(),
    SUPABASE_URL: z.url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    SUPABASE_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } };

export const service: Db = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  NO_SESSION,
);

/** UUID estable a partir de un nombre: el escenario tiene siempre los mismos ids. */
export function demoId(name: string): string {
  const h = createHash('sha256').update(`crecer-demo:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Lectura (o escritura con .select) que tiene que devolver datos. */
export function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${what}: sin datos`);
  return result.data;
}

/** Escritura sin datos de vuelta: solo importa que no haya error. */
export function ok(result: { error: { message: string } | null }, what: string): void {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
}

/**
 * Sesión de una cuenta de la demo sin usar su contraseña: un enlace mágico generado con la clave
 * de servicio (no envía correo). Así el escenario se arma con las RPC y RLS de cada persona.
 */
export async function sessionFor(email: string): Promise<{ db: Db; token: string }> {
  const link = await service.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw new Error(`Enlace para ${email}: ${link.error.message}`);
  const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, NO_SESSION);
  const verified = await db.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (verified.error || !verified.data.session) {
    throw new Error(`Sesión de ${email}: ${verified.error?.message ?? 'sin sesión'}`);
  }
  return { db, token: verified.data.session.access_token };
}

/** Las cuatro guardas de EXPOTEC_DEMO.md §5. Aborta el proceso si alguna falla. */
export async function enforceGuards(action: string): Promise<void> {
  const setting = await service
    .from('app_settings')
    .select('value')
    .eq('key', ENVIRONMENT_SETTING_KEY)
    .maybeSingle();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const confirmation = await rl.question(`${action}. Escribí ${CONFIRMATION_PHRASE} para seguir: `);
  rl.close();
  const problems = checkGuards({
    appEnv: env.APP_ENV,
    supabaseUrl: env.SUPABASE_URL,
    confirmation,
    environmentSetting: setting.data?.value ?? null,
  });
  if (problems.length > 0) {
    // Sin process.exit: en Windows, salir con la terminal todavía abierta corta con un error de libuv.
    throw new Error(`No se hace nada:\n- ${problems.join('\n- ')}`);
  }
}
