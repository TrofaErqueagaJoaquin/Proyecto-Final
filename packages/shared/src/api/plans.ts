import { z } from 'zod';

/**
 * POST /v1/plans/generate: arma el plan de la semana con el generador por reglas
 * (packages/domain/src/plans) y lo guarda. Volver a generar reemplaza el de esa semana.
 */
export const GeneratePlanRequestSchema = z.object({
  familyId: z.uuid(),
  /** null = plan de la familia en general. */
  memberId: z.uuid().nullable(),
  /** Lunes de la semana (YYYY-MM-DD). Por defecto, la semana actual. */
  weekStart: z.iso.date().optional(),
});
export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;

export const GeneratePlanResponseSchema = z.object({
  planId: z.uuid(),
  weekStart: z.iso.date(),
  items: z.number().int(),
});
export type GeneratePlanResponse = z.infer<typeof GeneratePlanResponseSchema>;
