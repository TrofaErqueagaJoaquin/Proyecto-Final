import { z } from 'zod';

/**
 * POST /v1/assistant/conversations/:conversationId/messages
 *
 * Responde por SSE (text/event-stream). La pregunta se guarda antes de responder y la respuesta
 * al terminar; el historial lo lee la API de la base, nunca lo manda el cliente
 * (AI_ARCHITECTURE.md §7.3).
 */
export const ASSISTANT_QUESTION_MAX = 2000;

export const SendAssistantMessageSchema = z.object({
  question: z.string().trim().min(1).max(ASSISTANT_QUESTION_MAX),
});
export type SendAssistantMessage = z.infer<typeof SendAssistantMessageSchema>;

export const AssistantCitationSchema = z.object({
  ref: z.string(),
  slug: z.string(),
  title: z.string(),
  urlPath: z.string().nullable(),
  evidenceLabel: z.string(),
});
export type AssistantCitation = z.infer<typeof AssistantCitationSchema>;

export const AssistantOutcomeSchema = z.enum([
  'answered',
  'insufficient_evidence',
  'risk_redirect',
  'blocked',
  'refused',
  'error',
]);
export type AssistantOutcome = z.infer<typeof AssistantOutcomeSchema>;

export const RiskCategorySchema = z.enum([
  'self_harm',
  'abuse',
  'medical_emergency',
  'grooming',
  'clinical',
]);

export const AssistantMessageSchema = z.object({
  id: z.uuid(),
  body: z.string(),
  citations: z.array(AssistantCitationSchema),
  outcome: AssistantOutcomeSchema,
  riskLevel: z.enum(['none', 'clinical', 'high']),
  riskCategory: RiskCategorySchema.nullable(),
  /** Respuesta del modelo de ensayo (AI_LLM_PROVIDER=fake): la app lo avisa siempre. */
  rehearsal: z.boolean(),
});
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

/** Eventos SSE, en orden: `start` → `delta`* → `done` (o `error`). */
export const AssistantEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), userMessageId: z.uuid() }),
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done'), message: AssistantMessageSchema }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type AssistantEvent = z.infer<typeof AssistantEventSchema>;
