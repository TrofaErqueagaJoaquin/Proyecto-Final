import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { createSupabaseTokenVerifier, type TokenVerifier } from './verify-token';

const URL_SUPABASE = 'https://proyecto-test.supabase.co';
const ISSUER = `${URL_SUPABASE}/auth/v1`;
const USER_ID = '11111111-1111-4111-8111-111111111111';

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let verify: TokenVerifier;

async function sign(
  payload: JWTPayload,
  options: { issuer?: string; audience?: string; exp?: string } = {},
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: 'clave-test' })
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(options.exp ?? '1h')
    .sign(privateKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair('ES256');
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'clave-test', alg: 'ES256' };
  verify = createSupabaseTokenVerifier(URL_SUPABASE, createLocalJWKSet({ keys: [jwk] }));
});

describe('createSupabaseTokenVerifier', () => {
  it('acepta un JWT válido y extrae la identidad', async () => {
    const token = await sign({ sub: USER_ID, role: 'authenticated', email: 'ana@test.invalid' });
    await expect(verify(token)).resolves.toEqual({
      userId: USER_ID,
      email: 'ana@test.invalid',
      aal: 'aal1',
      token,
    });
  });

  it('informa el nivel de autenticación con MFA', async () => {
    const token = await sign({ sub: USER_ID, role: 'authenticated', aal: 'aal2' });
    expect((await verify(token)).aal).toBe('aal2');
  });

  it('rechaza tokens vencidos', async () => {
    const token = await sign({ sub: USER_ID, role: 'authenticated' }, { exp: '-1m' });
    await expect(verify(token)).rejects.toThrow();
  });

  it('rechaza tokens de otro proyecto (emisor distinto)', async () => {
    const token = await sign(
      { sub: USER_ID, role: 'authenticated' },
      { issuer: 'https://otro.supabase.co/auth/v1' },
    );
    await expect(verify(token)).rejects.toThrow();
  });

  it('rechaza tokens con otra audiencia', async () => {
    const token = await sign({ sub: USER_ID, role: 'authenticated' }, { audience: 'otra' });
    await expect(verify(token)).rejects.toThrow();
  });

  it('rechaza tokens anónimos (rol anon)', async () => {
    const token = await sign({ sub: USER_ID, role: 'anon' });
    await expect(verify(token)).rejects.toThrow();
  });

  it('rechaza tokens firmados con otra clave', async () => {
    const other = await generateKeyPair('ES256');
    const token = await new SignJWT({ sub: USER_ID, role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'clave-test' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(other.privateKey);
    await expect(verify(token)).rejects.toThrow();
  });

  it('rechaza tokens simétricos (HS256), aunque el resto sea válido', async () => {
    const token = await new SignJWT({ sub: USER_ID, role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('un-secreto-cualquiera-de-32-bytes!!'));
    await expect(verify(token)).rejects.toThrow();
  });

  it('rechaza basura', async () => {
    await expect(verify('no-es-un-jwt')).rejects.toThrow();
  });
});
