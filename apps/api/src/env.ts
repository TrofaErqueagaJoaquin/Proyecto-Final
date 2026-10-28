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
  // Asistente (AI_ARCHITECTURE.md §3.1). Sin ANTHROPIC_API_KEY el asistente responde "no
  // configurado", salvo AI_LLM_PROVIDER=fake (respuestas deterministas, sin costo: ensayos).
  AI_LLM_PROVIDER: z.enum(['anthropic', 'fake']).default('anthropic'),
  // Haiku 5.5: unas 20 veces más barato que Sonnet 5.5 (ADR-032). Se cambia con esta variable.
  AI_CHAT_MODEL: z.string().default('claude-haiku-5-5'),
  ANTHROPIC_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  // Sin VOYAGE_API_KEY la búsqueda usa solo texto completo (modo degradado, §4.3).
  AI_EMBEDDING_MODEL: z.string().default('voyage-3.5'),
  VOYAGE_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
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
