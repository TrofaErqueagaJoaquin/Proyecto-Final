import type { ErrorCode, ErrorResponse } from '@crecer/shared';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { AppBindings } from '../types';

/** Error que la API devuelve tal cual (código estable + mensaje para la persona usuaria). */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorResponse(
  c: Context<AppBindings>,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
) {
  const body: ErrorResponse = { error: { code, message, requestId: c.get('requestId') } };
  return c.json(body, status);
}
