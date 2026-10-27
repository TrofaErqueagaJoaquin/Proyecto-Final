import { ErrorResponseSchema, type ErrorCode } from '@crecer/shared';
import type { z } from 'zod';

import { publicEnv } from './env';
import { supabase } from './supabase';

/** Error de la API propia con su código estable (packages/shared/src/errors.ts). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Llama a la API con el JWT de la sesión y valida la respuesta con el esquema compartido.
 * Nunca confía en la forma de la respuesta sin validarla.
 */
export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const { data } = await supabase.auth.getSession();
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${publicEnv.EXPO_PUBLIC_API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'SERVICE_UNAVAILABLE', 'No pudimos conectarnos. Revisá tu conexión.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(body);
    if (parsed.success) {
      const { code, message, requestId } = parsed.data.error;
      throw new ApiError(response.status, code, message, requestId);
    }
    throw new ApiError(response.status, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  }
  return schema.parse(body);
}
