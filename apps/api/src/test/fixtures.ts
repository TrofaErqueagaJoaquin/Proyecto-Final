import type { MeResponse } from '@crecer/shared';

import type { AppDeps } from '../app';
import type { AuthorizationPort } from '../auth/authorization';
import { loadEnv } from '../env';
import type { AuthContext } from '../types';

export const testEnv = loadEnv({
  APP_ENV: 'local',
  CORS_ORIGINS: 'http://localhost:8081, http://localhost:19006',
  SUPABASE_URL: 'https://proyecto-test.supabase.co/',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
});

export const ANA: AuthContext = {
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'ana@test.invalid',
  aal: 'aal1',
  token: 'token-ana',
};

/** Verificador falso: acepta solo los tokens registrados. */
export function fakeVerifier(sessions: Record<string, AuthContext>) {
  return (token: string) => {
    const auth = sessions[token];
    return auth ? Promise.resolve(auth) : Promise.reject(new Error('token inválido'));
  };
}

/** Autorización falsa: permisos por usuario y familias por usuario. */
export function fakeAuthorization(grants: {
  permissions?: Record<string, string[]>;
  families?: Record<string, Record<string, string>>;
}): AuthorizationPort {
  return {
    hasPermission: (auth, permission) =>
      Promise.resolve(grants.permissions?.[auth.userId]?.includes(permission) ?? false),
    isFamilyAdult: (auth, familyId, roles) => {
      const role = grants.families?.[auth.userId]?.[familyId];
      return Promise.resolve(role !== undefined && (!roles || roles.includes(role)));
    },
  };
}

export function fakeDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  const me: MeResponse = {
    userId: ANA.userId,
    email: ANA.email,
    aal: ANA.aal,
    profile: { displayName: 'Ana', themePref: 'system' },
    permissions: [],
    families: [],
  };
  return {
    verifyToken: fakeVerifier({ [ANA.token]: ANA }),
    authorization: fakeAuthorization({}),
    loadMe: () => Promise.resolve(me),
    invitations: {
      create: (_auth, invitation) =>
        Promise.resolve({
          id: '44444444-4444-4444-8444-444444444444',
          familyName: `Familia ${invitation.familyId.slice(0, 4)}`,
        }),
    },
    assessments: {
      loadAttempt: () => Promise.resolve(null),
      loadVersion: () => Promise.reject(new Error('sin cuestionario')),
      loadAnswers: () => Promise.resolve([]),
      resolveTargets: () => Promise.resolve({ content: new Map(), activities: new Map() }),
      finalize: () => Promise.resolve('ok'),
    },
    mailer: { sendInvitation: () => Promise.resolve(false) },
    now: () => new Date('2026-10-27T12:00:00.000Z'),
    generateToken: () => 'token-de-prueba',
    ...overrides,
  };
}
