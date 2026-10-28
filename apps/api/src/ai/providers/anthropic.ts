import Anthropic from '@anthropic-ai/sdk';

import type { LlmEvent, LlmProvider, LlmUsage } from './types';

/**
 * Claude por streaming (ADR-028: claude-sonnet-5-5).
 * - Pensamiento adaptativo (no se envía `thinking`) con esfuerzo `low`: respuestas de chat.
 * - Sin temperatura: los parámetros de muestreo devuelven 400.
 * - `system` con cache_control: la parte fija se cobra a precio de caché.
 * - Si el modelo declina (`stop_reason: "refusal"`), el fallback del servidor lo reintenta en
 *   otro modelo cuando la categoría lo permite; si igual declina, se avisa como `refusal`.
 * Solo se reenvían los bloques `text`: los de pensamiento no se muestran.
 */
export function createAnthropicProvider(apiKey: string, model: string): LlmProvider {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });

  return {
    id: 'anthropic',
    model,
    async *streamChat({ system, user, maxOutputTokens, signal }): AsyncIterable<LlmEvent> {
      const stream = client.beta.messages.stream(
        {
          model,
          max_tokens: maxOutputTokens,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: user }],
        },
        { signal },
      );

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'delta', text: event.delta.text };
        }
      }

      const message = await stream.finalMessage();
      const usage: LlmUsage = {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
      };
      if (message.stop_reason === 'refusal') {
        yield { type: 'refusal', usage, model: message.model };
        return;
      }
      yield {
        type: 'done',
        usage,
        stopReason: message.stop_reason ?? 'end_turn',
        model: message.model,
      };
    },
  };
}
