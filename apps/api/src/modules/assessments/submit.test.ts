import { ErrorResponseSchema, SubmitAssessmentResponseSchema } from '@crecer/shared';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app';
import { HttpError } from '../../lib/http';
import { ANA, fakeDeps, testEnv } from '../../test/fixtures';
import type { AnswerRow, AssessmentsPort, AttemptRow, FinalizeInput } from './submit';

const ATTEMPT_ID = '77777777-7777-4777-8777-777777777777';
const VERSION_ID = '88888888-8888-4888-8888-888888888888';

const DEFINITION = {
  sections: [
    {
      code: 'sueno',
      title: 'Sueño',
      questions: [
        {
          id: 'q-bed',
          code: 'screens_before_bed',
          prompt: '¿Pantallas antes de dormir?',
          type: 'single',
          required: true,
          options: [
            { id: 'o-never', code: 'never', label: 'Nunca', value: 100 },
            { id: 'o-daily', code: 'daily', label: 'Todos los días', value: 0 },
          ],
        },
        {
          id: 'q-hours',
          code: 'sleep_hours',
          prompt: '¿Cuántas horas duerme?',
          type: 'number',
          required: true,
          number: { min: 0, max: 24, step: 0.5, unit: 'horas' },
          options: [],
        },
      ],
    },
  ],
};

const SPEC = {
  engineVersion: '1.0.0',
  dimensions: [
    {
      code: 'sueno',
      bands: [
        { max: 39, band: 'priority' },
        { max: 69, band: 'watch' },
        { max: 100, band: 'strength' },
      ],
      texts: { strength: 'Bien.', watch: 'Para mirar.', priority: 'Para empezar.' },
    },
  ],
  questionScoring: {
    screens_before_bed: { type: 'option_value' },
    sleep_hours: {
      type: 'age_range',
      ranges: [{ ageMonths: [36, 59], ideal: [10, 13] }],
      tolerance: 1,
    },
  },
  recommendations: [
    {
      code: 'routine',
      when: { dimension: 'sueno', bandIn: ['priority', 'watch'] },
      target: { activitySlug: 'rutina-para-dormir' },
      priority: 1,
      reason: 'El sueño apareció como algo para mirar.',
    },
    {
      code: 'archived',
      when: {},
      target: { contentSlug: 'ficha-archivada' },
      priority: 2,
      reason: 'Destino archivado.',
    },
    {
      code: 'stage',
      when: {},
      target: { contentSlug: 'etapa-3-5' },
      priority: 5,
      reason: 'Qué necesita a esta edad.',
    },
  ],
};

const ANSWERS: AnswerRow[] = [
  { questionId: 'q-bed', optionId: 'o-daily', valueNumber: null },
  { questionId: 'q-hours', optionId: null, valueNumber: 11 },
];

function fakeAssessments(overrides: {
  attempt?: Partial<AttemptRow> | null;
  answers?: AnswerRow[];
  scoringSpec?: unknown;
  finalize?: AssessmentsPort['finalize'];
}): AssessmentsPort & { finalized: FinalizeInput[] } {
  const finalized: FinalizeInput[] = [];
  return {
    finalized,
    loadAttempt: (auth) =>
      Promise.resolve(
        overrides.attempt === null || auth.userId !== ANA.userId
          ? null
          : {
              id: ATTEMPT_ID,
              versionId: VERSION_ID,
              memberAgeMonths: 48,
              status: 'in_progress',
              ...overrides.attempt,
            },
      ),
    loadVersion: () =>
      Promise.resolve({ definition: DEFINITION, scoringSpec: overrides.scoringSpec ?? SPEC }),
    loadAnswers: () => Promise.resolve(overrides.answers ?? ANSWERS),
    resolveTargets: (_auth, slugs) =>
      Promise.resolve({
        content: new Map(
          slugs.content.filter((s) => s === 'etapa-3-5').map((s) => [s, `id-${s}`] as const),
        ),
        activities: new Map(slugs.activities.map((s) => [s, `id-${s}`] as const)),
      }),
    finalize:
      overrides.finalize ??
      ((input) => {
        finalized.push(input);
        return Promise.resolve('ok');
      }),
  };
}

function submit(assessments: AssessmentsPort, attemptId = ATTEMPT_ID, token = ANA.token) {
  const app = createApp(testEnv, fakeDeps({ assessments }));
  return app.request(`/v1/assessments/${attemptId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('POST /v1/assessments/:attemptId/submit', () => {
  it('puntúa, resuelve las recomendaciones y guarda el resultado', async () => {
    const assessments = fakeAssessments({});
    const res = await submit(assessments);
    expect(res.status).toBe(200);
    expect(SubmitAssessmentResponseSchema.parse(await res.json())).toEqual({
      attemptId: ATTEMPT_ID,
      status: 'submitted',
      alreadySubmitted: false,
    });

    expect(assessments.finalized).toHaveLength(1);
    const [input] = assessments.finalized;
    expect(input?.submittedBy).toBe(ANA.userId);
    expect(input?.engineVersion).toBe('1.0.0');
    // (0 + 100) / 2 = 50 → watch
    expect(input?.scores).toEqual([
      {
        code: 'sueno',
        rawScore: 50,
        normalized: 50,
        band: 'watch',
        contributions: [
          { question: 'screens_before_bed', score: 0 },
          { question: 'sleep_hours', score: 100 },
        ],
      },
    ]);
    // El destino archivado se omite; el resto conserva el orden por prioridad.
    expect(input?.recommendations).toEqual([
      {
        rule: 'routine',
        priority: 1,
        reason: 'El sueño apareció como algo para mirar.',
        activityId: 'id-rutina-para-dormir',
      },
      {
        rule: 'stage',
        priority: 5,
        reason: 'Qué necesita a esta edad.',
        contentItemId: 'id-etapa-3-5',
      },
    ]);
  });

  it('es idempotente: un intento ya enviado responde 200 sin volver a puntuar', async () => {
    const assessments = fakeAssessments({ attempt: { status: 'submitted' } });
    const res = await submit(assessments);
    expect(res.status).toBe(200);
    expect(SubmitAssessmentResponseSchema.parse(await res.json()).alreadySubmitted).toBe(true);
    expect(assessments.finalized).toHaveLength(0);
  });

  it('si otro pedido lo envió primero (carrera), también responde 200', async () => {
    const assessments = fakeAssessments({ finalize: () => Promise.resolve('already_submitted') });
    const res = await submit(assessments);
    expect(res.status).toBe(200);
    expect(SubmitAssessmentResponseSchema.parse(await res.json()).alreadySubmitted).toBe(true);
  });

  it('un intento descartado responde 409', async () => {
    const res = await submit(fakeAssessments({ attempt: { status: 'discarded' } }));
    expect(res.status).toBe(409);
    expect(ErrorResponseSchema.parse(await res.json()).error.code).toBe('CONFLICT');
  });

  it('un error de la base al cerrar el intento llega con su código', async () => {
    const finalize = vi.fn(() =>
      Promise.reject(new HttpError(409, 'CONFLICT', 'Esta evaluación ya está cerrada.')),
    );
    const res = await submit(fakeAssessments({ finalize }));
    expect(res.status).toBe(409);
    expect(finalize).toHaveBeenCalledOnce();
  });

  it('con preguntas obligatorias sin responder, responde 400 y no guarda nada', async () => {
    const assessments = fakeAssessments({ answers: ANSWERS.slice(0, 1) });
    const res = await submit(assessments);
    expect(res.status).toBe(400);
    const body = ErrorResponseSchema.parse(await res.json());
    expect(body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Falta responder 1 pregunta.',
    });
    expect(assessments.finalized).toHaveLength(0);
  });

  it('quien no es owner/guardian de la familia recibe 404 (RLS no le muestra el intento)', async () => {
    const res = await submit(fakeAssessments({ attempt: null }));
    expect(res.status).toBe(404);
  });

  it('un id con formato inválido responde 404 sin consultar la base', async () => {
    const assessments = fakeAssessments({});
    const loadAttempt = vi.spyOn(assessments, 'loadAttempt');
    const res = await submit(assessments, 'no-es-un-uuid');
    expect(res.status).toBe(404);
    expect(loadAttempt).not.toHaveBeenCalled();
  });

  it('exige sesión', async () => {
    const res = await submit(fakeAssessments({}), ATTEMPT_ID, 'token-invalido');
    expect(res.status).toBe(401);
  });

  it('una especificación inválida en la base es un error interno (500), no un resultado', async () => {
    const assessments = fakeAssessments({ scoringSpec: { engineVersion: 'x' } });
    const res = await submit(assessments);
    expect(res.status).toBe(500);
    expect(assessments.finalized).toHaveLength(0);
  });
});
