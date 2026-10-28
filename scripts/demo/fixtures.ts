import { AssistantCitationSchema, AssistantOutcomeSchema } from '@crecer/shared';
import { z } from 'zod';

/** fixtures/conversation.json: lo escribe demo:capture con una respuesta real del asistente. */
export const ConversationFixtureSchema = z.object({
  capturedAt: z.iso.datetime(),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  title: z.string().min(1).max(120),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        body: z.string().min(1),
        citations: z.array(AssistantCitationSchema),
        riskLevel: z.enum(['none', 'clinical', 'high']).nullable(),
        outcome: AssistantOutcomeSchema.nullable(),
      }),
    )
    .min(2),
});
export type ConversationFixture = z.infer<typeof ConversationFixtureSchema>;
