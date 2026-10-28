import type { MeResponse } from '@crecer/shared';

import type {
  AssistantPort,
  ConversationRow,
  Quota,
  SaveMessageInput,
  SearchHit,
} from '../modules/assistant/port';

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
    assistant: memoryAssistant().port,
    plans: {
      loadInput: () => Promise.reject(new Error('sin planes')),
      save: () => Promise.resolve('66666666-6666-4666-8666-666666666666'),
    },
    llm: null,
    embeddings: null,
    mailer: { sendInvitation: () => Promise.resolve(false) },
    now: () => new Date('2026-10-27T12:00:00.000Z'),
    generateToken: () => 'token-de-prueba',
    ...overrides,
  };
}

/** Asistente en memoria: conversaciones, mensajes guardados, uso y una base de conocimiento. */
export function memoryAssistant(
  options: {
    conversations?: Record<string, ConversationRow & { userId: string }>;
    hits?: SearchHit[];
    quota?: Partial<Quota>;
  } = {},
) {
  const saved: SaveMessageInput[] = [];
  const usage: { costUsd: number; outputTokens: number }[] = [];
  const searches: { query: string; embedding: number[] | null; age: number | null }[] = [];
  const port: AssistantPort = {
    loadConversation: (auth, id) => {
      const c = options.conversations?.[id];
      return Promise.resolve(c && c.userId === auth.userId ? c : null);
    },
    loadHistory: (_auth, id) =>
      Promise.resolve(
        saved.filter((m) => m.conversationId === id).map((m) => ({ role: m.role, body: m.body })),
      ),
    memberAgeMonths: () => Promise.resolve(48),
    familyContext: () => Promise.resolve('Integrante de 4 años.'),
    quota: () =>
      Promise.resolve({
        enabled: true,
        monthlyBudgetUsd: 10,
        monthCostUsd: 0,
        dailyLimit: 30,
        minuteLimit: 6,
        todayMessages: 0,
        minuteMessages: 0,
        ...options.quota,
      }),
    saveMessage: (input) => {
      saved.push(input);
      return Promise.resolve(`00000000-0000-4000-8000-${String(saved.length).padStart(12, '0')}`);
    },
    addUsage: (input) => {
      usage.push({ costUsd: input.costUsd, outputTokens: input.outputTokens });
      return Promise.resolve();
    },
    touchConversation: () => Promise.resolve(),
    search: (query, embedding, age) => {
      searches.push({ query, embedding, age });
      return Promise.resolve(options.hits ?? []);
    },
  };
  return { port, saved, usage, searches };
}
