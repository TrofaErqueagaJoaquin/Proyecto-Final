import { z } from 'zod';

import type { EmbeddingProvider } from './types';

// API de embeddings de Voyage (verificada en docs.voyageai.com/reference/embeddings-api):
// POST /v1/embeddings con `input_type` query|document y `output_dimension` 1024.
const ENDPOINT = 'https://api.voyageai.com/v1/embeddings';
/** Máximo de textos por pedido (la API admite 1.000; se usa menos para no pasar el tope de tokens). */
const BATCH = 128;

const ResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()), index: z.number() })),
});

export function createVoyageProvider(
  apiKey: string,
  model: string,
  fetchImpl: typeof fetch = fetch,
): EmbeddingProvider {
  return {
    model,
    dimensions: 1024,
    async embed(texts, kind) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += BATCH) {
        const response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            input: texts.slice(i, i + BATCH),
            input_type: kind,
            output_dimension: 1024,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new Error(`Voyage respondió ${String(response.status)}`);
        const body = ResponseSchema.parse(await response.json());
        const ordered = [...body.data].sort((a, b) => a.index - b.index);
        for (const item of ordered) {
          if (item.embedding.length !== 1024) throw new Error('Dimensión de embedding inesperada');
          out.push(item.embedding);
        }
      }
      return out;
    },
  };
}
