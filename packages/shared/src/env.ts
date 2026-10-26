import { z } from 'zod';

/** Entornos de ejecución (ver docs/planning/ARCHITECTURE.md §8). */
export const AppEnvSchema = z.enum(['local', 'preview', 'demo', 'prod']);
export type AppEnv = z.infer<typeof AppEnvSchema>;
