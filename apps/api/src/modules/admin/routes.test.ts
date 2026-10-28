import { describe, expect, it } from 'vitest';

import { createApp } from '../../app';
import type { AuthContext } from '../../types';
import { ANA, fakeAuthorization, fakeDeps, fakeVerifier, testEnv } from '../../test/fixtures';

import type { AdminPort } from './routes';

const ANA_MFA: AuthContext = { ...ANA, aal: 'aal2', token: 'token-ana-mfa' };
const CRED = '77777777-7777-4777-8777-777777777777';
const USER = '88888888-8888-4888-8888-888888888888';

function spyAdmin() {
  const calls: string[] = [];
  const admin: AdminPort = {
    credentialDocumentUrl: () =>
      Promise.resolve({ status: 'ok' as const, url: 'https://firmada.test/archivo.pdf' }),
    verifyCredential: (input) => {
      calls.push(`verify:${input.result}:${input.verifierId}`);
      return Promise.resolve();
    },
    grantRole: (userId, role) => {
      calls.push(`grant:${userId}:${role}`);
      return Promise.resolve();
    },
    revokeRole: (userId, role) => {
      calls.push(`revoke:${userId}:${role}`);
      return Promise.resolve();
    },
  };
  return { admin, calls };
}

function app(permissions: string[], admin: AdminPort) {
  return createApp(
    testEnv,
    fakeDeps({
      verifyToken: fakeVerifier({ [ANA.token]: ANA, [ANA_MFA.token]: ANA_MFA }),
      authorization: fakeAuthorization({ permissions: { [ANA.userId]: permissions } }),
      admin,
    }),
  );
}

const post = (token: string, path: string, body?: unknown) => ({
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body ?? {}),
});

describe('administración', () => {
  it('sin segundo factor no se verifica nada', async () => {
    const spy = spyAdmin();
    const response = await app(['professionals.verify'], spy.admin).request(
      `/v1/admin/credentials/${CRED}/verify`,
      post(ANA.token, '', { result: 'verified', method: 'refeps' }),
    );
    expect(response.status).toBe(403);
    expect(await response.text()).toContain('MFA_REQUIRED');
    expect(spy.calls).toHaveLength(0);
  });

  it('sin el permiso, 403 (aunque tenga MFA)', async () => {
    const spy = spyAdmin();
    const response = await app([], spy.admin).request(
      `/v1/admin/credentials/${CRED}/verify`,
      post(ANA_MFA.token, '', { result: 'verified', method: 'refeps' }),
    );
    expect(response.status).toBe(403);
    expect(spy.calls).toHaveLength(0);
  });

  it('la verificadora aprueba una credencial y queda como verificadora', async () => {
    const spy = spyAdmin();
    const response = await app(['professionals.verify'], spy.admin).request(
      `/v1/admin/credentials/${CRED}/verify`,
      post(ANA_MFA.token, '', { result: 'verified', method: 'refeps', note: 'REFEPS ok' }),
    );
    expect(response.status).toBe(200);
    expect(spy.calls).toEqual([`verify:verified:${ANA.userId}`]);
  });

  it('da una URL firmada de corta duración para ver el archivo', async () => {
    const response = await app(['professionals.verify'], spyAdmin().admin).request(
      `/v1/admin/credentials/${CRED}/document-url`,
      post(ANA_MFA.token, ''),
    );
    expect(await response.json()).toEqual({
      url: 'https://firmada.test/archivo.pdf',
      expiresInSeconds: 60,
    });
  });

  it('asigna y quita roles con users.manage_roles', async () => {
    const spy = spyAdmin();
    const a = app(['users.manage_roles'], spy.admin);
    await a.request(`/v1/admin/users/${USER}/roles`, post(ANA_MFA.token, '', { role: 'auditor' }));
    await a.request(`/v1/admin/users/${USER}/roles/auditor`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ANA_MFA.token}` },
    });
    expect(spy.calls).toEqual([`grant:${USER}:auditor`, `revoke:${USER}:auditor`]);
  });

  it('rechaza un rol inexistente', async () => {
    const spy = spyAdmin();
    const response = await app(['users.manage_roles'], spy.admin).request(
      `/v1/admin/users/${USER}/roles`,
      post(ANA_MFA.token, '', { role: 'superusuario' }),
    );
    expect(response.status).toBe(400);
    expect(spy.calls).toHaveLength(0);
  });
});
