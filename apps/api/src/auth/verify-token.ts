import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';

import type { AuthContext } from '../types';

export type TokenVerifier = (token: string) => Promise<AuthContext>;

const ClaimsSchema = z.object({
  sub: z.uuid(),
  role: z.literal('authenticated'),
  email: z.string().optional(),
  aal: z.enum(['aal1', 'aal2']).optional(),
});

/**
 * Verifica JWT de Supabase Auth con sus claves públicas (JWKS): firma, emisor, audiencia y
 * vencimiento. Solo se aceptan algoritmos asimétricos, así la API nunca necesita el secreto
 * de firma. `keySet` permite inyectar claves locales en los tests.
 */
export function createSupabaseTokenVerifier(
  supabaseUrl: string,
  keySet?: JWTVerifyGetKey,
): TokenVerifier {
  const issuer = `${supabaseUrl}/auth/v1`;
  const keys = keySet ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
    });
    const claims = ClaimsSchema.parse(payload);
    return { userId: claims.sub, email: claims.email ?? null, aal: claims.aal ?? 'aal1', token };
  };
}
