// Capa de proveedores (AI_ARCHITECTURE.md §3.1): la única parte de la API que conoce un SDK de IA.
// Cambiar de proveedor es escribir otra implementación; recuperación, prompts y seguridad no cambian.

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type LlmEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; usage: LlmUsage; stopReason: string; model: string }
  | { type: 'refusal'; usage: LlmUsage; model: string };

export interface LlmProvider {
  readonly id: 'anthropic' | 'fake';
  readonly model: string;
  streamChat(input: {
    /** Estable entre pedidos: se cachea. */
    system: string;
    /** Contexto + documentos + historial + pregunta, en un solo turno del usuario. */
    user: string;
    maxOutputTokens: number;
    signal: AbortSignal;
  }): AsyncIterable<LlmEvent>;
}

export interface EmbeddingProvider {
  /** Se guarda en kb_documents.embedding_model. */
  readonly model: string;
  readonly dimensions: 1024;
  embed(texts: string[], kind: 'document' | 'query'): Promise<number[][]>;
}
