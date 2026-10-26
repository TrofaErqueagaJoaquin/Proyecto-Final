import { z } from 'zod';

import { AppEnvSchema } from '../env';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  env: AppEnvSchema,
  version: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
