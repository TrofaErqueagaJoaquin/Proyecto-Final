import { createHash } from 'node:crypto';

import { CreateInvitationResponseSchema, ErrorResponseSchema } from '@crecer/shared';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app';
import { HttpError } from '../../lib/http';
import { ANA, fakeAuthorization, fakeDeps, testEnv } from '../../test/fixtures';
import type { NewInvitation } from './invitations';
import { hashInvitationToken } from './invitations';

const FAMILY_ID = '55555555-5555-4555-8555-555555555555';

function post(app: ReturnType<typeof createApp>, body: unknown, familyId = FAMILY_ID) {
  return app.request(`/v1/families/${familyId}/invitations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANA.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /v1/families/:familyId/invitations', () => {
  it('crea la invitación, guarda solo el hash del token y devuelve el enlace', async () => {
    const stored: NewInvitation[] = [];
    const app = createApp(
      testEnv,
      fakeDeps({
        authorization: fakeAuthorization({ families: { [ANA.userId]: { [FAMILY_ID]: 'owner' } } }),
        invitations: {
          create: (_auth, invitation) => {
            stored.push(invitation);
            return Promise.resolve({
              id: '66666666-6666-4666-8666-666666666666',
              familyName: 'García',
            });
          },
        },
      }),
    );

    const res = await post(app, { email: ' Diego@Ejemplo.com ', role: 'guardian' });
    expect(res.status).toBe(201);
    const body = CreateInvitationResponseSchema.parse(await res.json());

    expect(body.inviteUrl).toBe('http://localhost:8081/invitacion?token=token-de-prueba');
    expect(body.emailSent).toBe(false);
    expect(body.expiresAt).toBe('2026-11-03T12:00:00.000Z'); // 7 días
    expect(stored[0]?.email).toBe('diego@ejemplo.com');
    expect(stored[0]?.tokenHashHex).toBe(
      createHash('sha256').update('token-de-prueba').digest('hex'),
    );
    expect(JSON.stringify(stored)).not.toContain('token-de-prueba');
  });

  it('una caregiver no puede invitar (404: no se revela la familia)', async () => {
    const app = createApp(
      testEnv,
      fakeDeps({
        authorization: fakeAuthorization({
          families: { [ANA.userId]: { [FAMILY_ID]: 'caregiver' } },
        }),
      }),
    );
    const res = await post(app, { email: 'x@ejemplo.com', role: 'caregiver' });
    expect(res.status).toBe(404);
  });

  it('valida el cuerpo con el esquema compartido', async () => {
    const app = createApp(
      testEnv,
      fakeDeps({
        authorization: fakeAuthorization({ families: { [ANA.userId]: { [FAMILY_ID]: 'owner' } } }),
      }),
    );
    const res = await post(app, { email: 'no-es-un-correo', role: 'platform_admin' });
    expect(res.status).toBe(400);
    expect(ErrorResponseSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('una invitación pendiente duplicada responde 409', async () => {
    const app = createApp(
      testEnv,
      fakeDeps({
        authorization: fakeAuthorization({ families: { [ANA.userId]: { [FAMILY_ID]: 'owner' } } }),
        invitations: {
          create: () =>
            Promise.reject(new HttpError(409, 'CONFLICT', 'Ya hay una invitación pendiente.')),
        },
      }),
    );
    const res = await post(app, { email: 'x@ejemplo.com', role: 'caregiver' });
    expect(res.status).toBe(409);
  });

  it('si el correo falla, la invitación igual se crea y se puede compartir el enlace', async () => {
    const app = createApp(
      testEnv,
      fakeDeps({
        authorization: fakeAuthorization({ families: { [ANA.userId]: { [FAMILY_ID]: 'owner' } } }),
        mailer: { sendInvitation: vi.fn(() => Promise.reject(new Error('SMTP caído'))) },
      }),
    );
    const res = await post(app, { email: 'x@ejemplo.com', role: 'caregiver' });
    expect(res.status).toBe(201);
    expect(CreateInvitationResponseSchema.parse(await res.json()).emailSent).toBe(false);
  });

  it('sin sesión responde 401', async () => {
    const app = createApp(testEnv, fakeDeps());
    const res = await app.request(`/v1/families/${FAMILY_ID}/invitations`, { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

describe('hashInvitationToken', () => {
  it('coincide con sha256 del token en UTF-8 (igual que la función SQL)', () => {
    expect(hashInvitationToken('ñandú')).toBe(
      createHash('sha256').update(Buffer.from('ñandú', 'utf8')).digest('hex'),
    );
  });
});
