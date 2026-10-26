import { describe, expect, it } from 'vitest';

import { HealthResponseSchema } from './api/health';
import { ErrorResponseSchema } from './errors';

describe('ErrorResponseSchema', () => {
  it('acepta un error con código conocido', () => {
    const parsed = ErrorResponseSchema.safeParse({
      error: { code: 'NOT_FOUND', message: 'No encontrado.', requestId: 'abc' },
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza códigos que no están en el catálogo', () => {
    const parsed = ErrorResponseSchema.safeParse({
      error: { code: 'SQL_ERROR', message: 'detalle interno', requestId: 'abc' },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('HealthResponseSchema', () => {
  it('rechaza entornos desconocidos', () => {
    expect(
      HealthResponseSchema.safeParse({ status: 'ok', env: 'staging', version: '1' }).success,
    ).toBe(false);
  });
});
