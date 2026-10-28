import {
  BLOCKED_ANSWER,
  classifyRisk,
  findForbidden,
  NO_INFO_SENTENCE,
  postCheck,
  RISK_RESPONSES,
  type RiskResult,
} from '@crecer/domain';
import {
  SendAssistantMessageSchema,
  type AssistantCitation,
  type AssistantEvent,
  type AssistantMessage,
  type AssistantOutcome,
} from '@crecer/shared';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import { estimateCostUsd } from '../../ai/pricing';
import {
  buildUserMessage,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  type PromptDocument,
} from '../../ai/prompts/assistant-v1';
import type { EmbeddingProvider, LlmProvider, LlmUsage } from '../../ai/providers/types';
import { errorResponse } from '../../lib/http';
import { log } from '../../lib/logger';
import type { AppBindings } from '../../types';

import type { AssistantPort, SearchHit } from './port';

/** Similitud coseno mínima para considerar que hay evidencia (se calibra con el banco, §4.3). */
export const MIN_SIMILARITY = 0.35;
export const MIN_COVERAGE = 0.2;
const MAX_OUTPUT_TOKENS = 4096;
const FIRST_TOKEN_TIMEOUT_MS = 20_000;
const TOTAL_TIMEOUT_MS = 60_000;

const NO_INFO_ANSWER = `${NO_INFO_SENTENCE} Podés buscar en la biblioteca o mirar “Cuándo consultar” si algo te preocupa.`;
const REFUSED_ANSWER =
  'No puedo ayudarte con eso por acá. Si es algo que te preocupa, hablalo con un profesional de confianza.';
const ERROR_ANSWER = 'No pude terminar la respuesta. Probá de nuevo en un rato.';
const ZERO_USAGE: LlmUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

export interface AssistantDeps {
  assistant: AssistantPort;
  /** null = sin clave configurada: el asistente responde "no configurado" (salvo riesgo alto). */
  llm: LlmProvider | null;
  /** null = solo texto completo (modo degradado). */
  embeddings: EmbeddingProvider | null;
}

/**
 * Hay evidencia si algún fragmento es parecido por vector, o si entre los 3 primeros por texto
 * alguno contiene al menos el 20% de los términos de la pregunta. Con preguntas reales sobre el
 * contenido de crecer-dev la cobertura del documento correcto fue de 0,2 a 1: el umbral solo
 * frena lo que no coincide en nada; el modelo se abstiene si los documentos no alcanzan (regla
 * 2 del prompt). Se calibra con el banco de evaluación (§4.3, §10).
 */
export function hasEnoughEvidence(hits: SearchHit[]): boolean {
  return hits.some(
    (h) =>
      (h.similarity ?? 0) >= MIN_SIMILARITY ||
      (h.ftsRank !== null && h.ftsRank <= 3 && (h.ftsCoverage ?? 0) >= MIN_COVERAGE),
  );
}

function riskAnswer(risk: RiskResult): string {
  if (risk.level !== 'high' || risk.category === 'clinical' || risk.category === null) return '';
  const response = RISK_RESPONSES[risk.category];
  return [
    response.title,
    response.body,
    ...response.lines.map((l) => `• ${l.label}: ${l.phone}. ${l.description}`),
  ].join('\n\n');
}

function titleFrom(question: string): string {
  const clean = question.replace(/\s+/g, ' ').trim();
  return clean.length <= 60 ? clean : `${clean.slice(0, 57).trimEnd()}…`;
}

export function assistantRoute(deps: AssistantDeps) {
  const route = new Hono<AppBindings>();

  route.post('/v1/assistant/conversations/:conversationId/messages', async (c) => {
    const auth = c.get('auth');
    const parsed = SendAssistantMessageSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return errorResponse(
        c,
        400,
        'VALIDATION_ERROR',
        'Escribí una pregunta de hasta 2.000 caracteres.',
      );
    }
    const { question } = parsed.data;
    const conversation = await deps.assistant.loadConversation(auth, c.req.param('conversationId'));
    if (!conversation)
      return errorResponse(c, 404, 'NOT_FOUND', 'La conversación no existe o venció.');

    const risk = classifyRisk(question);
    // El riesgo alto se responde SIEMPRE, sin modelo y sin cuotas (§7.1).
    if (risk.level !== 'high') {
      if (!deps.llm) {
        return errorResponse(
          c,
          503,
          'ASSISTANT_DISABLED',
          'El asistente todavía no está configurado.',
        );
      }
      const quota = await deps.assistant.quota(auth.userId);
      if (!quota.enabled || quota.monthCostUsd >= quota.monthlyBudgetUsd) {
        return errorResponse(
          c,
          503,
          'ASSISTANT_DISABLED',
          'El asistente está en pausa porque se alcanzó el límite de uso de este mes. Mientras tanto, la biblioteca sigue disponible.',
        );
      }
      if (quota.todayMessages >= quota.dailyLimit) {
        return errorResponse(
          c,
          429,
          'RATE_LIMITED',
          'Llegaste al máximo de preguntas de hoy. Mañana podés seguir.',
        );
      }
      if (quota.minuteMessages >= quota.minuteLimit) {
        return errorResponse(
          c,
          429,
          'RATE_LIMITED',
          'Mandaste muchas preguntas seguidas. Esperá un minuto.',
        );
      }
    }

    const history = await deps.assistant.loadHistory(auth, conversation.id);
    const userMessageId = await deps.assistant.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      body: question,
      riskLevel: risk.level,
    });
    const requestId = c.get('requestId');

    return streamSSE(c, async (stream) => {
      const send = (event: AssistantEvent) => stream.writeSSE({ data: JSON.stringify(event) });
      await send({ type: 'start', userMessageId });

      let outcome: AssistantOutcome;
      let body: string;
      let citations: AssistantCitation[] = [];
      let usage = ZERO_USAGE;
      let model: string | null = null;

      try {
        if (risk.level === 'high') {
          outcome = 'risk_redirect';
          body = riskAnswer(risk);
        } else {
          const ageMonths = conversation.memberId
            ? await deps.assistant.memberAgeMonths(auth, conversation.memberId)
            : null;
          // P0: la consulta de recuperación suma la pregunta anterior (para "¿y a la noche?").
          const previous = [...history].reverse().find((t) => t.role === 'user')?.body ?? '';
          const retrievalQuery = `${previous} ${question}`.trim();
          let embedding: number[] | null = null;
          if (deps.embeddings) {
            try {
              [embedding = null] = await deps.embeddings.embed([retrievalQuery], 'query');
            } catch (error) {
              log('warn', 'assistant_degraded_search', {
                requestId,
                error: error instanceof Error ? error.message : 'desconocido',
              });
            }
          }
          const hits = await deps.assistant.search(retrievalQuery, embedding, ageMonths);

          if (!hasEnoughEvidence(hits) || !deps.llm) {
            outcome = 'insufficient_evidence';
            body = NO_INFO_ANSWER;
          } else {
            const documents: (PromptDocument & { hit: SearchHit })[] = hits.map((hit, i) => ({
              ref: `F${String(i + 1)}`,
              title: hit.title,
              headingPath: hit.headingPath,
              evidenceLabel: hit.evidenceLabel,
              body: hit.body,
              ageRange: null,
              hit,
            }));
            const familyContext = conversation.usePersonalContext
              ? await deps.assistant.familyContext(auth, conversation)
              : null;
            const user = buildUserMessage({
              question,
              documents,
              history,
              familyContext,
              clinical: risk.level === 'clinical',
            });

            const controller = new AbortController();
            const total = setTimeout(() => {
              controller.abort();
            }, TOTAL_TIMEOUT_MS);
            // Sin primer token en 20 s se cancela (§9); después rige solo el tope total.
            const firstToken = setTimeout(() => {
              controller.abort();
            }, FIRST_TOKEN_TIMEOUT_MS);
            let text = '';
            let blockedBy: string | null = null;
            let refused = false;
            try {
              for await (const event of deps.llm.streamChat({
                system: SYSTEM_PROMPT,
                user,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                signal: controller.signal,
              })) {
                if (event.type === 'delta') {
                  clearTimeout(firstToken);
                  text += event.text;
                  // Se corta apenas aparece algo prohibido: la familia nunca lo lee (§7.2).
                  blockedBy = findForbidden(text);
                  if (blockedBy) {
                    controller.abort();
                    break;
                  }
                  await send({ type: 'delta', text: event.text });
                } else {
                  usage = event.usage;
                  model = event.model;
                  refused = event.type === 'refusal';
                }
              }
            } finally {
              clearTimeout(total);
              clearTimeout(firstToken);
            }

            if (blockedBy) {
              outcome = 'blocked';
              body = BLOCKED_ANSWER;
              log('warn', 'assistant_blocked_output', { requestId, pattern: blockedBy });
            } else if (refused) {
              outcome = 'refused';
              body = REFUSED_ANSWER;
            } else {
              const checked = postCheck(
                text,
                documents.map((d) => d.ref),
              );
              outcome = checked.outcome;
              body = checked.text;
              const seen = new Set<string>();
              citations = checked.citedRefs.flatMap((ref) => {
                const doc = documents.find((d) => d.ref === ref);
                if (!doc || seen.has(ref)) return [];
                seen.add(ref);
                return [
                  {
                    ref,
                    slug: doc.hit.slug,
                    title: doc.hit.title,
                    urlPath: doc.hit.urlPath,
                    evidenceLabel: doc.hit.evidenceLabel,
                  },
                ];
              });
              if (checked.removedRefs.length > 0) {
                log('warn', 'assistant_invalid_citations', {
                  requestId,
                  count: checked.removedRefs.length,
                });
              }
            }
          }
        }
      } catch (error) {
        log('error', 'assistant_failed', {
          requestId,
          error: error instanceof Error ? error.message : 'desconocido',
        });
        outcome = 'error';
        body = ERROR_ANSWER;
      }

      const messageId = await deps.assistant.saveMessage({
        conversationId: conversation.id,
        role: 'assistant',
        body,
        citations,
        riskLevel: risk.level,
        outcome,
        promptVersion: PROMPT_VERSION,
        model,
      });
      await deps.assistant.addUsage({
        userId: auth.userId,
        familyId: conversation.familyId,
        ...usage,
        costUsd: model ? estimateCostUsd(deps.llm?.model ?? model, usage) : 0,
      });
      await deps.assistant.touchConversation(
        conversation.id,
        history.length === 0 ? titleFrom(question) : conversation.title,
      );
      // Sin el texto: nivel de riesgo, resultado y tokens (§8).
      log('info', 'assistant_answer', {
        requestId,
        risk: risk.level,
        outcome,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadTokens,
      });

      const message: AssistantMessage = {
        id: messageId,
        body,
        citations,
        outcome,
        riskLevel: risk.level,
        riskCategory: risk.category,
        rehearsal: model === 'fake',
      };
      await send({ type: 'done', message });
    });
  });

  return route;
}
