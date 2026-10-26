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
