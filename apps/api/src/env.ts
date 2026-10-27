import { AppEnvSchema } from '@crecer/shared';
import { z } from 'zod';

const EnvSchema = z.object({
  APP_ENV: AppEnvSchema.default('local'),
  PORT: z.coerce.number().int().positive().default(8787),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  // Origen público de la app (enlaces de invitación y redirecciones).
  APP_PUBLIC_URL: z
    .url()
    .default('http://localhost:8081')
    .transform((url) => url.replace(/\/+$/, '')),
  SUPABASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  // Clave publicable (sb_publishable_…): pública por diseño; la API la usa con el JWT del usuario.
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Clave secreta (sb_secret_…): saltea RLS. Solo para RPC privilegiadas; opcional en desarrollo.
  // Vacía (como en .env.example) cuenta como ausente.
  SUPABASE_SECRET_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  // Correo transaccional (Resend). Sin clave, las invitaciones se comparten por enlace.
  RESEND_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  MAIL_FROM: z.string().default('Crecer en Casa <no-responder@crecerencasa.invalid>'),
});

export type Env = z.infer<typeof EnvSchema>;

/** Valida las variables al arrancar: si falta o sobra algo, la API no inicia. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
