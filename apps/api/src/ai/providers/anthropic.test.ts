import { describe, expect, it } from 'vitest';

import { estimateCostUsd } from '../pricing';

import { supportsServerFallback } from './anthropic';

describe('supportsServerFallback', () => {
  it.each([
    ['claude-sonnet-5-5', true],
    ['claude-opus-5-5', true],
    ['claude-haiku-5-5', false],
    ['otro-modelo', false],
  ] as const)('%s → %s', (model, expected) => {
    expect(supportsServerFallback(model)).toBe(expected);
  });
});

describe('estimateCostUsd', () => {
  const usage = { inputTokens: 3000, outputTokens: 300, cacheReadTokens: 0, cacheWriteTokens: 0 };

  it('Haiku 5.5 cuesta unas 20 veces menos que Sonnet 5.5', () => {
    const haiku = estimateCostUsd('claude-haiku-5-5', usage);
    const sonnet = estimateCostUsd('claude-sonnet-5-5', usage);
    expect(haiku).toBeCloseTo(0.00045, 6);
    expect(sonnet / haiku).toBeCloseTo(20, 0);
  });

  it('un modelo desconocido se cobra como el más caro (nunca subestima)', () => {
    expect(estimateCostUsd('desconocido', usage)).toBe(estimateCostUsd('claude-opus-5-5', usage));
  });
});
