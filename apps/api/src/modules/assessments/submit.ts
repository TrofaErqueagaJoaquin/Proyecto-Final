import {
  answersFromRows,
  QuestionnaireDefinitionSchema,
  recommend,
  scoreAttempt,
  ScoringSpecSchema,
  type DimensionResult,
  type RecommendationResult,
} from '@crecer/domain';
import type { Json, SubmitAssessmentResponse } from '@crecer/shared';
import { Hono } from 'hono';

import type { Env } from '../../env';
import { toHttpError } from '../../lib/db-errors';
import { errorResponse, HttpError } from '../../lib/http';
import { log } from '../../lib/logger';
import { createServiceClient, createUserClient } from '../../lib/supabase';
import type { AppBindings, AuthContext } from '../../types';

export interface AttemptRow {
  id: string;
  versionId: string;
  memberAgeMonths: number;
  status: 'in_progress' | 'submitted' | 'discarded';
}

export interface AnswerRow {
  questionId: string;
  optionId: string | null;
  valueNumber: number | null;
}

export interface FinalizeInput {
  attemptId: string;
  submittedBy: string;
  engineVersion: string;
  scores: DimensionResult[];
  recommendations: (Omit<RecommendationResult, 'target'> &
    ({ contentItemId: string } | { activityId: string }))[];
}

/** Lecturas con el JWT de la persona (RLS) y la escritura del resultado con service_role. */
export interface AssessmentsPort {
  /** null si no existe o si quien pregunta no es owner/guardian de esa familia (RLS). */
  loadAttempt(auth: AuthContext, attemptId: string): Promise<AttemptRow | null>;
  loadVersion(
    auth: AuthContext,
    versionId: string,
  ): Promise<{ definition: unknown; scoringSpec: unknown }>;
  loadAnswers(auth: AuthContext, attemptId: string): Promise<AnswerRow[]>;
  /** Slugs → ids de lo publicado (lo archivado o inexistente no vuelve). */
  resolveTargets(
    auth: AuthContext,
    slugs: { content: string[]; activities: string[] },
  ): Promise<{ content: Map<string, string>; activities: Map<string, string> }>;
  /** 'already_submitted' si otro pedido lo envió primero (carrera). */
  finalize(input: FinalizeInput): Promise<'ok' | 'already_submitted'>;
}

/** Las interfaces del dominio no tienen firma de índice: se pasan por JSON para el RPC. */
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function createSupabaseAssessments(env: Env): AssessmentsPort {
  return {
    async loadAttempt(auth, attemptId) {
      const result = await createUserClient(env, auth.token)
        .from('assessment_attempts')
        .select('id, version_id, member_age_months, status')
        .eq('id', attemptId)
        .maybeSingle();
      if (result.error) throw toHttpError(result.error);
      if (!result.data) return null;
      return {
        id: result.data.id,
        versionId: result.data.version_id,
        memberAgeMonths: result.data.member_age_months,
        status: result.data.status as AttemptRow['status'],
      };
    },
    async loadVersion(auth, versionId) {
      const db = createUserClient(env, auth.token);
      const [definition, version] = await Promise.all([
        db.rpc('questionnaire_definition', { p_version_id: versionId }),
        db.from('questionnaire_versions').select('scoring_spec').eq('id', versionId).single(),
      ]);
      if (definition.error) throw toHttpError(definition.error);
      if (version.error) throw toHttpError(version.error);
      return { definition: definition.data, scoringSpec: version.data.scoring_spec };
    },
    async loadAnswers(auth, attemptId) {
      const result = await createUserClient(env, auth.token)
        .from('assessment_answers')
        .select('question_id, option_id, value_number')
        .eq('attempt_id', attemptId);
      if (result.error) throw toHttpError(result.error);
      return result.data.map((row) => ({
        questionId: row.question_id,
        optionId: row.option_id,
        valueNumber: row.value_number,
      }));
    },
    async resolveTargets(auth, slugs) {
      const db = createUserClient(env, auth.token);
      const [content, activities] = await Promise.all([
        db.from('content_items').select('id, slug').in('slug', slugs.content),
        db.from('activities').select('id, slug').in('slug', slugs.activities),
      ]);
      if (content.error) throw toHttpError(content.error);
      if (activities.error) throw toHttpError(activities.error);
      return {
        content: new Map(content.data.map((c) => [c.slug, c.id])),
        activities: new Map(activities.data.map((a) => [a.slug, a.id])),
      };
    },
    async finalize(input) {
      const result = await createServiceClient(env).rpc('finalize_assessment', {
        p_attempt_id: input.attemptId,
        p_submitted_by: input.submittedBy,
        p_engine_version: input.engineVersion,
        p_scores: toJson(input.scores),
        p_recommendations: toJson(input.recommendations),
      });
      if (result.error) {
        if (
          result.error.code === 'P0001' &&
          result.error.message === 'ASSESSMENT_ALREADY_SUBMITTED'
        ) {
          return 'already_submitted';
        }
        throw toHttpError(result.error);
      }
      return 'ok';
    },
  };
}

export function assessmentsRoute(deps: { assessments: AssessmentsPort }) {
  const route = new Hono<AppBindings>();

  route.post('/v1/assessments/:attemptId/submit', async (c) => {
    const auth = c.get('auth');
    const attemptId = c.req.param('attemptId');
    const respond = (alreadySubmitted: boolean) => {
      const body: SubmitAssessmentResponse = { attemptId, status: 'submitted', alreadySubmitted };
      return c.json(body);
    };

    // RLS: la caregiver y otras familias no ven el intento → 404 (no se revela que existe).
    const attempt = /^[0-9a-f-]{36}$/i.test(attemptId)
      ? await deps.assessments.loadAttempt(auth, attemptId)
      : null;
    if (!attempt) return errorResponse(c, 404, 'NOT_FOUND', 'La evaluación no existe.');
    if (attempt.status === 'submitted') return respond(true);
    if (attempt.status === 'discarded') {
      return errorResponse(c, 409, 'CONFLICT', 'Esta evaluación fue descartada.');
    }

    const version = await deps.assessments.loadVersion(auth, attempt.versionId);
    const definition = QuestionnaireDefinitionSchema.safeParse(version.definition);
    const spec = ScoringSpecSchema.safeParse(version.scoringSpec);
    if (!definition.success || !spec.success) {
      throw new Error(`Versión de cuestionario inválida: ${attempt.versionId}`);
    }

    const answers = answersFromRows(
      definition.data,
      await deps.assessments.loadAnswers(auth, attemptId),
    );
    const result = scoreAttempt(definition.data, spec.data, attempt.memberAgeMonths, answers);
    if (result.missingRequired.length > 0) {
      const count = result.missingRequired.length;
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        count === 1
          ? 'Falta responder 1 pregunta.'
          : `Faltan responder ${String(count)} preguntas.`,
      );
    }

    const recommendations = recommend(
      definition.data,
      spec.data,
      attempt.memberAgeMonths,
      answers,
      result,
    );
    const targets = await deps.assessments.resolveTargets(auth, {
      content: recommendations.flatMap((r) =>
        'contentSlug' in r.target ? [r.target.contentSlug] : [],
      ),
      activities: recommendations.flatMap((r) =>
        'activitySlug' in r.target ? [r.target.activitySlug] : [],
      ),
    });
    const resolved: FinalizeInput['recommendations'] = [];
    for (const { target, ...rest } of recommendations) {
      const id =
        'contentSlug' in target
          ? targets.content.get(target.contentSlug)
          : targets.activities.get(target.activitySlug);
      if (!id) {
        // Un destino archivado no rompe el envío: se omite y queda registrado.
        log('warn', 'recommendation_target_missing', { rule: rest.rule, target });
        continue;
      }
      resolved.push({
        ...rest,
        ...('contentSlug' in target ? { contentItemId: id } : { activityId: id }),
      });
    }

    const outcome = await deps.assessments.finalize({
      attemptId,
      submittedBy: auth.userId,
      engineVersion: result.engineVersion,
      scores: result.dimensions,
      recommendations: resolved,
    });
    return respond(outcome === 'already_submitted');
  });

  return route;
}
