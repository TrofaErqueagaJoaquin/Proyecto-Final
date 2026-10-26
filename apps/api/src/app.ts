import type { ErrorCode, ErrorResponse, HealthResponse } from '@crecer/shared';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { Env } from './env';
import { log } from './lib/logger';
import { API_VERSION } from './version';

function errorResponse(c: Context, status: ContentfulStatusCode, code: ErrorCode, message: string) {
  const body: ErrorResponse = { error: { code, message, requestId: c.get('requestId') } };
  return c.json(body, status);
}

export function createApp(env: Env) {
  const app = new Hono();

  app.use(requestId());
  app.use(secureHeaders());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: false, maxAge: 600 }));
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

  app.notFound((c) => errorResponse(c, 404, 'NOT_FOUND', 'El recurso no existe.'));

  app.onError((error, c) => {
    log('error', 'unhandled_error', {
      requestId: c.get('requestId'),
      path: c.req.path,
      error: error.message,
    });
    return errorResponse(c, 500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  });

  return app;
}
