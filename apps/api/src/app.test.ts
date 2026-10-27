import { ErrorResponseSchema, HealthResponseSchema, MeResponseSchema } from '@crecer/shared';
import { describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadEnv } from './env';
import { HttpError } from './lib/http';
import { ANA, fakeDeps, testEnv } from './test/fixtures';

const app = createApp(testEnv, fakeDeps());

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

describe('GET /v1/me', () => {
  it('sin sesión responde 401 con el formato uniforme', async () => {
    const res = await app.request('/v1/me');
    expect(res.status).toBe(401);
    expect(ErrorResponseSchema.parse(await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('con un token inválido responde 401', async () => {
    const res = await app.request('/v1/me', { headers: { Authorization: 'Bearer otro' } });
    expect(res.status).toBe(401);
  });

  it('con sesión devuelve los datos de la persona', async () => {
    const res = await app.request('/v1/me', {
      headers: { Authorization: `Bearer ${ANA.token}` },
    });
    expect(res.status).toBe(200);
    expect(MeResponseSchema.parse(await res.json()).userId).toBe(ANA.userId);
  });

  it('los HttpError del dominio llegan con su estado y su código', async () => {
    const failing = createApp(
      testEnv,
      fakeDeps({ loadMe: () => Promise.reject(new HttpError(403, 'FORBIDDEN', 'No.')) }),
    );
    const res = await failing.request('/v1/me', {
      headers: { Authorization: `Bearer ${ANA.token}` },
    });
    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.parse(await res.json()).error.code).toBe('FORBIDDEN');
  });

  it('los errores inesperados se ocultan detrás de un 500 genérico', async () => {
    const failing = createApp(
      testEnv,
      fakeDeps({ loadMe: () => Promise.reject(new Error('detalle interno de la base')) }),
    );
    const res = await failing.request('/v1/me', {
      headers: { Authorization: `Bearer ${ANA.token}` },
    });
    expect(res.status).toBe(500);
    const body = ErrorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toContain('detalle interno');
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
  const base = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'pk' };

  it('rechaza un APP_ENV desconocido', () => {
    expect(() => loadEnv({ ...base, APP_ENV: 'staging' })).toThrow(/APP_ENV/);
  });

  it('exige la URL y la clave publicable de Supabase', () => {
    expect(() => loadEnv({ APP_ENV: 'local' })).toThrow(/SUPABASE_URL/);
  });

  it('una clave secreta vacía cuenta como ausente', () => {
    expect(loadEnv({ ...base, SUPABASE_SECRET_KEY: '' }).SUPABASE_SECRET_KEY).toBeUndefined();
  });

  it('normaliza la URL de Supabase sin barra final', () => {
    expect(loadEnv({ ...base, SUPABASE_URL: 'https://x.supabase.co/' }).SUPABASE_URL).toBe(
      'https://x.supabase.co',
    );
  });
});
