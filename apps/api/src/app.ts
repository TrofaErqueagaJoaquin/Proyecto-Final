import type { HealthResponse } from '@crecer/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';

import { createSupabaseAuthorization, type AuthorizationPort } from './auth/authorization';
import { createSupabaseTokenVerifier, type TokenVerifier } from './auth/verify-token';
import type { Env } from './env';
import { errorResponse, HttpError } from './lib/http';
import { log } from './lib/logger';
import { requireAuth } from './middleware/auth';
import { createSupabaseMeRepository, type LoadMe } from './modules/me/repository';
import type { AppBindings } from './types';
import { API_VERSION } from './version';

/** Puertos hacia el exterior: en producción, Supabase; en los tests, dobles en memoria. */
export interface AppDeps {
  verifyToken: TokenVerifier;
  authorization: AuthorizationPort;
  loadMe: LoadMe;
}

export function createDefaultDeps(env: Env): AppDeps {
  return {
    verifyToken: createSupabaseTokenVerifier(env.SUPABASE_URL),
    authorization: createSupabaseAuthorization(env),
    loadMe: createSupabaseMeRepository(env),
  };
}

export function createApp(env: Env, deps: AppDeps) {
  const app = new Hono<AppBindings>();
  const authenticated = requireAuth(deps.verifyToken);

  app.use(requestId());
  app.use(secureHeaders());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
      credentials: false,
      maxAge: 600,
    }),
  );
  app.use(async (c, next) => {
    const startedAt = performance.now();
    await next();
    log('info', 'request', {
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
  });

  app.get('/v1/health', (c) => {
    const body: HealthResponse = { status: 'ok', env: env.APP_ENV, version: API_VERSION };
    return c.json(body);
  });

  app.get('/v1/me', authenticated, async (c) => c.json(await deps.loadMe(c.get('auth'))));

  app.notFound((c) => errorResponse(c, 404, 'NOT_FOUND', 'El recurso no existe.'));

  app.onError((error, c) => {
    if (error instanceof HttpError && error.status < 500) {
      return errorResponse(c, error.status, error.code, error.message);
    }
    log('error', 'unhandled_error', {
      requestId: c.get('requestId'),
      path: c.req.path,
      error: error.message,
    });
    return errorResponse(c, 500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  });

  return app;
}
