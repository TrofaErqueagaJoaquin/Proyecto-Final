import type { LlmUsage } from './providers/types';

// US$ por millón de tokens (referencia de la API de Claude, 2026-10). Se usa para estimar el
// gasto y apagar el asistente al llegar al tope mensual (ADR-028). Si el fallback del servidor
// responde con otro modelo, se estima igual con el precio del modelo pedido.
const PRICES: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

/** Costo estimado en US$. Un modelo desconocido se cobra como el más caro (nunca subestima). */
export function estimateCostUsd(model: string, usage: LlmUsage): number {
  const price = PRICES[model] ?? PRICES['claude-opus-5-5'];
  if (!price) return 0;
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite) /
    1_000_000
  );
}
