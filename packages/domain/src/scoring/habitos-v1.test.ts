import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import habitosV1 from '../../../../content/questionnaires/habitos-v1.yaml?raw';

import { recommend, scoreAttempt, visibleQuestions, type AnswerInput } from './engine';
import { QuestionnaireFileSchema, type QuestionnaireDefinition } from './spec.schema';

// Recorre el cuestionario real (content/questionnaires/habitos-v1.yaml) como lo haría una
// familia: responde cada pregunta visible, en orden, y puntúa. Es el "responder → resultado"
// sin interfaz ni base.

const file = QuestionnaireFileSchema.parse(parse(habitosV1));
const definition: QuestionnaireDefinition = { sections: file.sections };
const spec = file.scoring;

type Pick = 'best' | 'worst';

/** Responde pregunta por pregunta (las condicionales aparecen según lo ya respondido). */
function answerAll(ageMonths: number, pick: Pick, hours: number): AnswerInput[] {
  const answers: AnswerInput[] = [];
  for (;;) {
    const pending = visibleQuestions(definition, ageMonths, answers).find(
      (l) => !answers.some((a) => a.question === l.question.code),
    );
    if (!pending) return answers;
    const { question } = pending;
    if (question.type === 'number') {
      answers.push({ question: question.code, value: hours });
      continue;
    }
    const byValue = [...question.options].sort((a, b) => a.value - b.value);
    // En las preguntas de tiempo de pantalla "mejor" es menos tiempo (valor en horas).
    const screenTime = question.code.startsWith('screen_');
    const best = screenTime ? byValue[0] : byValue.at(-1);
    const worst = screenTime ? byValue.at(-1) : byValue[0];
    const chosen = pick === 'best' ? best : worst;
    // En la selección múltiple, "mejor" es elegir todas las que suman.
    const options =
      question.type === 'multi' && pick === 'best'
        ? question.options.filter((o) => o.value > 0).map((o) => o.code)
        : [chosen?.code ?? ''];
    answers.push({ question: question.code, options });
  }
}

// Horas de sueño dentro del rango ideal de cada edad.
const AGES: [string, number, number][] = [
  ['6 meses', 6, 13],
  ['18 meses', 18, 12],
  ['4 años', 48, 11],
  ['8 años', 96, 10],
  ['13 años', 160, 9],
];

describe('habitos-v1 · recorrido completo', () => {
  it.each(AGES)('%s, todo bien: sin preguntas faltantes y todo en Fortaleza', (_l, age, hours) => {
    const answers = answerAll(age, 'best', hours);
    const result = scoreAttempt(definition, spec, age, answers);
    expect(result.missingRequired).toEqual([]);
    expect(result.dimensions.length).toBeGreaterThan(0);
    for (const d of result.dimensions) expect([d.code, d.band]).toEqual([d.code, 'strength']);
    // Sin nada para mirar, solo la ficha de la etapa.
    const recs = recommend(definition, spec, age, answers, result);
    expect(recs.map((r) => r.rule)).toEqual([expect.stringMatching(/^stage_/)]);
  });

  it.each(AGES)('%s, todo para mirar: bandas bajas y recomendaciones', (_l, age) => {
    const answers = answerAll(age, 'worst', 4);
    const result = scoreAttempt(definition, spec, age, answers);
    expect(result.missingRequired).toEqual([]);
    for (const d of result.dimensions) expect(d.band).not.toBe('strength');
    const recs = recommend(definition, spec, age, answers, result);
    expect(recs.length).toBeGreaterThan(1);
    expect(recs.length).toBeLessThanOrEqual(spec.maxRecommendations);
    // De 13 en adelante no hay regla de prioridad 1 (pendiente para una v2: ADR-027).
    expect(recs[0]?.priority).toBeLessThanOrEqual(age >= 145 ? 2 : 1);
  });

  it('las dimensiones dependen de la edad', () => {
    const codes = (age: number) =>
      scoreAttempt(definition, spec, age, answerAll(age, 'best', 11)).dimensions.map((d) => d.code);
    expect(codes(6)).toEqual(['sueno', 'movimiento', 'pantalla_tiempo', 'pantalla_contexto']);
    expect(codes(48)).toEqual([
      'sueno',
      'movimiento',
      'pantalla_tiempo',
      'pantalla_contexto',
      'calma',
      'acuerdos',
    ]);
    // Desde los 5 años el tiempo de pantalla es descriptivo; desde los 13 no hay sección de calma.
    expect(codes(160)).toEqual(['sueno', 'movimiento', 'pantalla_contexto', 'acuerdos']);
  });

  it('dos evaluaciones del mismo chico muestran el cambio', () => {
    const first = scoreAttempt(definition, spec, 48, answerAll(48, 'worst', 8));
    const second = scoreAttempt(definition, spec, 50, answerAll(50, 'best', 11));
    const band = (r: typeof first, code: string) => r.dimensions.find((d) => d.code === code)?.band;
    expect(band(first, 'sueno')).toBe('priority');
    expect(band(second, 'sueno')).toBe('strength');
  });

  it('un bebé que mira videos recibe primero la ficha A', () => {
    const answers = answerAll(18, 'best', 12).map((a) =>
      a.question === 'screen_weekday' ? { ...a, options: ['h1_2'] } : a,
    );
    const result = scoreAttempt(definition, spec, 18, answers);
    expect(recommend(definition, spec, 18, answers, result)[0]?.target).toEqual({
      contentSlug: 'ficha-a-bebe-videos',
    });
  });
});
