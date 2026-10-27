import { z } from 'zod';

/**
 * POST /v1/assessments/:attemptId/submit: puntúa el intento con el motor de packages/domain
 * y guarda el resultado. Es idempotente: si el intento ya se envió, responde lo mismo con
 * `alreadySubmitted: true` y no vuelve a puntuar.
 */
export const SubmitAssessmentResponseSchema = z.object({
  attemptId: z.uuid(),
  status: z.literal('submitted'),
  alreadySubmitted: z.boolean(),
});
export type SubmitAssessmentResponse = z.infer<typeof SubmitAssessmentResponseSchema>;
