import type { HealthResponse } from '@crecer/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';

import { createAnthropicProvider } from './ai/providers/anthropic';
import { createFakeLlm } from './ai/providers/fake';
import type { EmbeddingProvider, LlmProvider } from './ai/providers/types';
import { createVoyageProvider } from './ai/providers/voyage';
import { createSupabaseAuthorization, type AuthorizationPort } from './auth/authorization';
import { createSupabaseTokenVerifier, type TokenVerifier } from './auth/verify-token';
import type { Env } from './env';
import { errorResponse, HttpError } from './lib/http';
import { log } from './lib/logger';
import { createResendMailer, disabledMailer, type Mailer } from './lib/mailer';
import { requireAuth } from './middleware/auth';
import { adminRoute, createSupabaseAdmin, type AdminPort } from './modules/admin/routes';
import {
  assessmentsRoute,
  createSupabaseAssessments,
  type AssessmentsPort,
} from './modules/assessments/submit';
import { createSupabaseAssistant, type AssistantPort } from './modules/assistant/port';
import { assistantRoute } from './modules/assistant/route';
import {
  createSupabaseInvitations,
  generateInvitationToken,
  invitationsRoute,
  type InvitationsPort,
} from './modules/families/invitations';
import { createSupabaseMeRepository, type LoadMe } from './modules/me/repository';
import { createSupabasePlans, plansRoute, type PlansPort } from './modules/plans/generate';
import type { AppBindings } from './types';
import { API_VERSION } from './version';

/** Puertos hacia el exterior: en producción, Supabase; en los tests, dobles en memoria. */
export interface AppDeps {
  verifyToken: TokenVerifier;
  authorization: AuthorizationPort;
  loadMe: LoadMe;
  invitations: InvitationsPort;
  assessments: AssessmentsPort;
  assistant: AssistantPort;
  plans: PlansPort;
  admin: AdminPort;
  /** null = sin clave: el asistente responde "no configurado" (salvo riesgo alto). */
  llm: LlmProvider | null;
  /** null = búsqueda solo por texto completo. */
  embeddings: EmbeddingProvider | null;
  mailer: Mailer;
  now: () => Date;
  generateToken: () => string;
}

export function createDefaultDeps(env: Env): AppDeps {
  return {
    verifyToken: createSupabaseTokenVerifier(env.SUPABASE_URL),
    authorization: createSupabaseAuthorization(env),
    loadMe: createSupabaseMeRepository(env),
    invitations: createSupabaseInvitations(env),
    assessments: createSupabaseAssessments(env),
    assistant: createSupabaseAssistant(env),
    plans: createSupabasePlans(env),
    admin: createSupabaseAdmin(env),
    llm:
      env.AI_LLM_PROVIDER === 'fake'
        ? createFakeLlm()
        : env.ANTHROPIC_API_KEY
          ? createAnthropicProvider(env.ANTHROPIC_API_KEY, env.AI_CHAT_MODEL)
          : null,
    embeddings: env.VOYAGE_API_KEY
      ? createVoyageProvider(env.VOYAGE_API_KEY, env.AI_EMBEDDING_MODEL)
      : null,
    mailer: env.RESEND_API_KEY
      ? createResendMailer(env.RESEND_API_KEY, env.MAIL_FROM)
      : disabledMailer,
    now: () => new Date(),
    generateToken: generateInvitationToken,
  };
}

export function createApp(env: Env, deps: AppDeps) {
  const app = new Hono<AppBindings>();
  const authenticated = requireAuth(deps.verifyToken);

  app.use(requestId());
  app.use(secureHeaders());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
      credentials: false,
      maxAge: 600,
    }),
  );
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

  app.get('/v1/me', authenticated, async (c) => c.json(await deps.loadMe(c.get('auth'))));

  app.use('/v1/families/*', authenticated);
  app.route(
    '/',
    invitationsRoute({
      authorization: deps.authorization,
      invitations: deps.invitations,
      mailer: deps.mailer,
      now: deps.now,
      generateToken: deps.generateToken,
      appPublicUrl: env.APP_PUBLIC_URL,
    }),
  );

  app.use('/v1/assessments/*', authenticated);
  app.route('/', assessmentsRoute({ assessments: deps.assessments }));

  app.use('/v1/admin/*', authenticated);
  app.route('/', adminRoute({ admin: deps.admin, authorization: deps.authorization }));

  app.use('/v1/plans/*', authenticated);
  app.route(
    '/',
    plansRoute({ plans: deps.plans, authorization: deps.authorization, now: deps.now }),
  );

  app.use('/v1/assistant/*', authenticated);
  app.route(
    '/',
    assistantRoute({ assistant: deps.assistant, llm: deps.llm, embeddings: deps.embeddings }),
  );

  app.notFound((c) => errorResponse(c, 404, 'NOT_FOUND', 'El recurso no existe.'));

  app.onError((error, c) => {
    if (error instanceof HttpError && error.status < 500) {
      return errorResponse(c, error.status, error.code, error.message);
    }
    log('error', 'unhandled_error', {
      requestId: c.get('requestId'),
      path: c.req.path,
      error: error.message,
    });
    return errorResponse(c, 500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  });

  return app;
}
