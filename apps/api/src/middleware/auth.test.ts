import { ErrorResponseSchema } from '@crecer/shared';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { describe, expect, it } from 'vitest';

import { ANA, fakeAuthorization, fakeVerifier } from '../test/fixtures';
import type { AppBindings, AuthContext } from '../types';
import { requireAuth, requireFamilyRole, requirePermission } from './auth';

const ADMIN: AuthContext = {
  userId: '22222222-2222-4222-8222-222222222222',
  email: 'admin@test.invalid',
  aal: 'aal1',
  token: 'token-admin',
};
const ADMIN_MFA: AuthContext = { ...ADMIN, aal: 'aal2', token: 'token-admin-mfa' };
const FAMILY_ID = '33333333-3333-4333-8333-333333333333';

const authorization = fakeAuthorization({
  permissions: { [ADMIN.userId]: ['users.manage_roles'] },
  families: { [ANA.userId]: { [FAMILY_ID]: 'caregiver' } },
});

const app = new Hono<AppBindings>();
app.use(requestId());
app.use(
  requireAuth(
    fakeVerifier({ [ANA.token]: ANA, [ADMIN.token]: ADMIN, [ADMIN_MFA.token]: ADMIN_MFA }),
  ),
);
app.get('/roles', requirePermission(authorization, 'users.manage_roles', { mfa: true }), (c) =>
  c.text('ok'),
);
app.get(
  '/families/:familyId/members',
  requireFamilyRole(authorization, ['owner', 'guardian', 'caregiver']),
  (c) => c.text('ok'),
);
app.get('/families/:familyId/settings', requireFamilyRole(authorization, ['owner']), (c) =>
  c.text('ok'),
);

async function get(path: string, token?: string) {
  const res = await app.request(
    path,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  );
  const body: unknown = res.status === 200 ? await res.text() : await res.json();
  return { status: res.status, body };
}

function codeOf(body: unknown) {
  return ErrorResponseSchema.parse(body).error.code;
}

describe('requireAuth', () => {
  it('sin encabezado Authorization → 401', async () => {
    const { status, body } = await get('/roles');
    expect(status).toBe(401);
    expect(codeOf(body)).toBe('UNAUTHORIZED');
  });

  it('con un esquema distinto de Bearer → 401', async () => {
    const res = await app.request('/roles', { headers: { Authorization: `Basic ${ANA.token}` } });
    expect(res.status).toBe(401);
  });
});

describe('requirePermission', () => {
  it('sin el permiso → 403 FORBIDDEN', async () => {
    const { status, body } = await get('/roles', ANA.token);
    expect(status).toBe(403);
    expect(codeOf(body)).toBe('FORBIDDEN');
  });

  it('con el permiso pero sin MFA → 403 MFA_REQUIRED', async () => {
    const { status, body } = await get('/roles', ADMIN.token);
    expect(status).toBe(403);
    expect(codeOf(body)).toBe('MFA_REQUIRED');
  });

  it('con el permiso y MFA → pasa', async () => {
    expect((await get('/roles', ADMIN_MFA.token)).status).toBe(200);
  });
});

describe('requireFamilyRole', () => {
  it('un adulto de la familia con rol permitido pasa', async () => {
    expect((await get(`/families/${FAMILY_ID}/members`, ANA.token)).status).toBe(200);
  });

  it('un rol insuficiente recibe 404 (no se revela la existencia)', async () => {
    const { status, body } = await get(`/families/${FAMILY_ID}/settings`, ANA.token);
    expect(status).toBe(404);
    expect(codeOf(body)).toBe('NOT_FOUND');
  });

  it('una persona ajena recibe 404', async () => {
    expect((await get(`/families/${FAMILY_ID}/members`, ADMIN_MFA.token)).status).toBe(404);
  });
});
