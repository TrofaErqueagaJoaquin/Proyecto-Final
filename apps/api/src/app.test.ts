import { ErrorResponseSchema, HealthResponseSchema } from '@crecer/shared';
import { describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadEnv } from './env';

const app = createApp(
  loadEnv({ APP_ENV: 'local', CORS_ORIGINS: 'http://localhost:8081, http://localhost:19006' }),
);

describe('GET /v1/health', () => {
  it('responde 200 con el contrato compartido', async () => {
    const res = await app.request('/v1/health');
    expect(res.status).toBe(200);
    const body = HealthResponseSchema.parse(await res.json());
    expect(body.env).toBe('local');
  });

  it('agrega un X-Request-Id a cada respuesta', async () => {
    const res = await app.request('/v1/health');
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('permite CORS solo a los orígenes configurados', async () => {
    const allowed = await app.request('/v1/health', {
      headers: { Origin: 'http://localhost:8081' },
    });
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081');

    const blocked = await app.request('/v1/health', {
      headers: { Origin: 'https://evil.example' },
    });
    expect(blocked.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('rutas inexistentes', () => {
  it('devuelven el formato de error uniforme', async () => {
    const res = await app.request('/v1/no-existe');
    expect(res.status).toBe(404);
    const body = ErrorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe(res.headers.get('X-Request-Id'));
  });
});

describe('loadEnv', () => {
  it('rechaza un APP_ENV desconocido', () => {
    expect(() => loadEnv({ APP_ENV: 'staging' })).toThrow(/APP_ENV/);
  });
});
