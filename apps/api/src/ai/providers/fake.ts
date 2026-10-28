import type { EmbeddingProvider, LlmEvent, LlmProvider } from './types';

/**
 * Proveedores deterministas: para los tests y para ensayar la demo sin costo
 * (AI_LLM_PROVIDER=fake). El modelo falso arma la respuesta con el primer documento recibido.
 */
export function createFakeLlm(script?: (user: string) => string): LlmProvider {
  return {
    id: 'fake',
    model: 'fake',
    async *streamChat({ user }): AsyncIterable<LlmEvent> {
      const answer =
        script?.(user) ??
        (/<doc id="F1"/.test(user)
          ? 'Según la ficha, conviene anticipar y acompañar el cambio [F1]. Con poco tiempo: un aviso de 5 minutos alcanza [F1].'
          : 'No tengo información revisada sobre esto.');
      for (const word of answer.split(/(?<= )/)) {
        await Promise.resolve();
        yield { type: 'delta', text: word };
      }
      yield {
        type: 'done',
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        stopReason: 'end_turn',
        model: 'fake',
      };
    },
  };
}

/** Embedding falso: un vector disperso y estable a partir de las palabras del texto. */
export function createFakeEmbeddings(): EmbeddingProvider {
  return {
    model: 'fake-1024',
    dimensions: 1024,
    embed(texts) {
      return Promise.resolve(
        texts.map((text) => {
          const vector = new Array<number>(1024).fill(0);
          for (const word of text.toLowerCase().split(/\W+/).filter(Boolean)) {
            let hash = 0;
            for (const ch of word) hash = (hash * 31 + ch.charCodeAt(0)) % 1024;
            vector[hash] = (vector[hash] ?? 0) + 1;
          }
          const norm = Math.hypot(...vector) || 1;
          return vector.map((v) => v / norm);
        }),
      );
    },
  };
}
