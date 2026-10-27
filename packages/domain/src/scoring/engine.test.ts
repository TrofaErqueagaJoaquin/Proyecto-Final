import { describe, expect, it } from 'vitest';

import { answersFromRows, recommend, scoreAttempt, visibleQuestions } from './engine';
import type { AnswerInput } from './engine';
import { findClinicalTerms } from './language';
import {
  checkSpecAgainstDefinition,
  QuestionnaireDefinitionSchema,
  ScoringSpecSchema,
} from './spec.schema';

const DEFINITION = QuestionnaireDefinitionSchema.parse({
  sections: [
    {
      code: 'sueno',
      title: 'Sueño',
      questions: [
        {
          id: 'q-sleep',
          code: 'sleep_hours',
          prompt: '¿Cuántas horas duerme?',
          type: 'number',
          number: { min: 0, max: 24, step: 0.5, unit: 'horas' },
        },
        {
          id: 'q-bed',
          code: 'screens_before_bed',
          prompt: '¿Pantallas antes de dormir?',
          type: 'single',
          options: [
            { id: 'o-bed-never', code: 'never', label: 'Nunca', value: 100 },
            { id: 'o-bed-some', code: 'sometimes', label: 'A veces', value: 50 },
            { id: 'o-bed-daily', code: 'daily', label: 'Todos los días', value: 0 },
          ],
        },
        {
          code: 'device_in_bedroom',
          prompt: '¿Dispositivos en el dormitorio?',
          type: 'single',
          required: false,
          options: [
            { code: 'no', label: 'No', value: 100 },
            { code: 'yes', label: 'Sí', value: 0 },
          ],
        },
      ],
    },
    {
      code: 'pantalla_tiempo',
      title: 'Tiempo de pantalla',
      questions: [
        {
          code: 'screen_weekday',
          prompt: 'Pantalla en un día de semana',
          type: 'single',
          options: [
            { code: 'none', label: 'Nada', value: 0 },
            { code: 'lt30', label: 'Menos de 30 min', value: 0.25 },
            { code: 'h1', label: 'Hasta 1 h', value: 1 },
            { code: 'h2', label: '1 a 2 h', value: 2 },
            { code: 'h3', label: 'Más de 2 h', value: 3 },
          ],
        },
      ],
    },
    {
      code: 'calma',
      title: 'Calma',
      minAgeMonths: 12,
      maxAgeMonths: 155,
      questions: [
        {
          code: 'device_to_calm',
          prompt: '¿El dispositivo es la forma de calmarlo?',
          type: 'single',
          options: [
            { code: 'rarely', label: 'Casi nunca', value: 100 },
            { code: 'often', label: 'Seguido', value: 30 },
            { code: 'always', label: 'Casi siempre', value: 0 },
          ],
        },
        {
          code: 'other_strategies',
          prompt: '¿Qué otras estrategias funcionan?',
          type: 'multi',
          options: [
            { code: 'hug', label: 'Abrazo', value: 40 },
            { code: 'walk', label: 'Salir a caminar', value: 40 },
            { code: 'music', label: 'Música', value: 40 },
            { code: 'none', label: 'Ninguna por ahora', value: 0 },
          ],
        },
        {
          code: 'reaction_turn_off',
          prompt: '¿Cómo reacciona al apagar?',
          type: 'single',
          minAgeMonths: 24,
          showIf: { question: 'device_to_calm', noneOf: ['rarely'] },
          options: [
            { code: 'calm', label: 'Tranquilo', value: 100 },
            { code: 'intense', label: 'Se enoja mucho', value: 20 },
          ],
        },
      ],
    },
  ],
});

const SPEC = ScoringSpecSchema.parse({
  engineVersion: '1.0.0',
  dimensions: ['sueno', 'pantalla_tiempo', 'calma'].map((code) => ({
    code,
    bands: [
      { max: 39, band: 'priority' },
      { max: 69, band: 'watch' },
      { max: 100, band: 'strength' },
    ],
    texts: { strength: 'Bien.', watch: 'Para mirar.', priority: 'Para empezar.' },
  })),
  questionScoring: {
    sleep_hours: {
      type: 'age_range',
      ranges: [
        { ageMonths: [12, 35], ideal: [11, 14] },
        { ageMonths: [36, 59], ideal: [10, 13] },
      ],
      tolerance: 1,
    },
    screens_before_bed: { type: 'option_value' },
    device_in_bedroom: { type: 'option_value' },
    screen_weekday: {
      type: 'age_range',
      ranges: [
        { ageMonths: [0, 23], ideal: [0, 0] },
        { ageMonths: [24, 59], ideal: [0, 1] },
      ],
      tolerance: 1,
    },
    device_to_calm: { type: 'option_value' },
    other_strategies: { type: 'multi_sum', cap: 80 },
    reaction_turn_off: { type: 'option_value' },
  },
  recommendations: [
    {
      code: 'devices_out',
      when: {
        dimension: 'sueno',
        bandIn: ['priority', 'watch'],
        answer: { device_in_bedroom: 'yes' },
      },
      target: { contentSlug: 'sueno-y-pantallas' },
      priority: 1,
      reason: 'Hay dispositivos en el dormitorio.',
    },
    {
      code: 'turn_off',
      when: { answer: { reaction_turn_off: ['intense'] } },
      target: { contentSlug: 'ficha-c-reaccion-al-apagar' },
      priority: 1,
      reason: 'Apagar cuesta.',
    },
    {
      code: 'calm_alternatives',
      when: { dimension: 'calma', bandIn: ['priority'] },
      target: { activitySlug: 'rincon-de-la-calma' },
      priority: 2,
      reason: 'Sumar otras formas de calmarse.',
    },
    {
      code: 'calm_alternatives_dup',
      when: { dimension: 'calma', bandIn: ['priority'] },
      target: { activitySlug: 'rincon-de-la-calma' },
      priority: 3,
      reason: 'Repetida.',
    },
    {
      code: 'little_ones',
      when: { maxAgeMonths: 23 },
      target: { contentSlug: 'etapa-0-2' },
      priority: 4,
      reason: 'Para su edad.',
    },
    {
      code: 'general',
      when: {},
      target: { activitySlug: 'cocinar-juntos' },
      priority: 5,
      reason: 'Para hacer en familia.',
    },
  ],
  maxRecommendations: 3,
});

const FOUR_YEARS = 48;

/** Respuestas completas y "todo bien" para un chico de 4 años. */
function goodAnswers(): AnswerInput[] {
  return [
    { question: 'sleep_hours', value: 11 },
    { question: 'screens_before_bed', options: ['never'] },
    { question: 'device_in_bedroom', options: ['no'] },
    { question: 'screen_weekday', options: ['h1'] },
    { question: 'device_to_calm', options: ['rarely'] },
    { question: 'other_strategies', options: ['hug', 'walk'] },
  ];
}

function withAnswer(answers: AnswerInput[], answer: AnswerInput): AnswerInput[] {
  return [...answers.filter((a) => a.question !== answer.question), answer];
}

function dimension(answers: AnswerInput[], code: string, age = FOUR_YEARS) {
  return scoreAttempt(DEFINITION, SPEC, age, answers).dimensions.find((d) => d.code === code);
}

describe('scoreAttempt · bandas', () => {
  it('todo bien da Fortaleza en todas las dimensiones que aplican', () => {
    const result = scoreAttempt(DEFINITION, SPEC, FOUR_YEARS, goodAnswers());
    expect(result.engineVersion).toBe('1.0.0');
    expect(result.missingRequired).toEqual([]);
    expect(result.dimensions.map((d) => [d.code, d.band, d.normalized])).toEqual([
      ['sueno', 'strength', 100],
      ['pantalla_tiempo', 'strength', 100],
      ['calma', 'strength', 100],
    ]);
  });

  // Sueño: horas (100) + pantallas antes de dormir (x) → promedio de dos preguntas.
  it.each([
    // [opción, horas, normalizado, banda]
    ['daily', 7, 10, 'priority'], // (20 + 0) / 2
    ['daily', 9, 30, 'priority'], // (60 + 0) / 2
    ['sometimes', 7, 35, 'priority'], // (20 + 50) / 2
    ['sometimes', 9, 55, 'watch'], // (60 + 50) / 2
    ['daily', 11, 50, 'watch'], // (100 + 0) / 2
    ['sometimes', 11, 75, 'strength'], // (100 + 50) / 2
  ] as const)('antes de dormir "%s" y %d h → %d (%s)', (option, hours, normalized, band) => {
    const answers = withAnswer(
      withAnswer(
        goodAnswers().filter((a) => a.question !== 'device_in_bedroom'),
        { question: 'screens_before_bed', options: [option] },
      ),
      { question: 'sleep_hours', value: hours },
    );
    expect(dimension(answers, 'sueno')).toMatchObject({ normalized, band });
  });

  it.each([
    [39, 'priority'],
    [40, 'watch'],
    [69, 'watch'],
    [70, 'strength'],
  ] as const)('el corte %d cae en %s', (score, band) => {
    const spec = ScoringSpecSchema.parse({
      ...SPEC,
      questionScoring: { screens_before_bed: { type: 'option_value' } },
      recommendations: [],
    });
    const definition = QuestionnaireDefinitionSchema.parse({
      sections: [
        {
          ...DEFINITION.sections[0],
          questions: [
            {
              code: 'screens_before_bed',
              prompt: 'x',
              type: 'single',
              options: [
                { code: 'a', label: 'a', value: score },
                { code: 'b', label: 'b', value: 0 },
              ],
            },
          ],
        },
      ],
    });
    const result = scoreAttempt(
      definition,
      { ...spec, dimensions: spec.dimensions.slice(0, 1) },
      FOUR_YEARS,
      [{ question: 'screens_before_bed', options: ['a'] }],
    );
    expect(result.dimensions[0]?.band).toBe(band);
  });

  it('redondea el promedio para la banda y guarda el valor con dos decimales', () => {
    const answers = withAnswer(goodAnswers(), { question: 'other_strategies', options: ['hug'] });
    // device_to_calm 100 + other_strategies 40/80 = 50 → (100 + 50) / 2 = 75
    expect(dimension(answers, 'calma')).toMatchObject({ rawScore: 75, normalized: 75 });
    const three = withAnswer(answers, { question: 'device_to_calm', options: ['often'] });
    // 30 + 50 + reaction (calm 100) = 180 / 3 = 60
    const withReaction = [...three, { question: 'reaction_turn_off', options: ['calm'] }];
    expect(dimension(withReaction, 'calma')).toMatchObject({ rawScore: 60, normalized: 60 });
  });

  it('guarda qué preguntas pesaron, en el orden del cuestionario', () => {
    const answers = withAnswer(goodAnswers(), {
      question: 'screens_before_bed',
      options: ['daily'],
    });
    expect(dimension(answers, 'sueno')?.contributions).toEqual([
      { question: 'sleep_hours', score: 100 },
      { question: 'screens_before_bed', score: 0 },
      { question: 'device_in_bedroom', score: 100 },
    ]);
  });
});

describe('scoreAttempt · reglas por pregunta', () => {
  it.each([
    [11, 100],
    [14, 100],
    [10, 60],
    [15, 60],
    [9.5, 20],
    [16, 20],
  ])('sueño a los 2 años: %d h → %d', (hours, score) => {
    const answers = withAnswer(goodAnswers(), { question: 'sleep_hours', value: hours });
    const sleep = dimension(answers, 'sueno', 24);
    expect(sleep?.contributions[0]).toEqual({ question: 'sleep_hours', score });
  });

  it.each([
    ['none', 100],
    ['lt30', 60],
    ['h1', 60],
    ['h2', 20],
  ])('pantalla antes de los 2 años: "%s" → %d', (option, score) => {
    const answers = withAnswer(goodAnswers(), { question: 'screen_weekday', options: [option] });
    expect(dimension(answers, 'pantalla_tiempo', 18)?.normalized).toBe(score);
  });

  it.each([
    ['h1', 100],
    ['h2', 60],
    ['h3', 20],
  ])('pantalla de 2 a 4 años: "%s" → %d', (option, score) => {
    const answers = withAnswer(goodAnswers(), { question: 'screen_weekday', options: [option] });
    expect(dimension(answers, 'pantalla_tiempo')?.normalized).toBe(score);
  });

  it('desde los 5 años el tiempo de pantalla es descriptivo: no hay resultado', () => {
    expect(dimension(goodAnswers(), 'pantalla_tiempo', 60)).toBeUndefined();
  });

  it('la selección múltiple suma con tope', () => {
    const all = withAnswer(goodAnswers(), {
      question: 'other_strategies',
      options: ['hug', 'walk', 'music'],
    });
    expect(dimension(all, 'calma')?.contributions[1]).toEqual({
      question: 'other_strategies',
      score: 100,
    });
    const none = withAnswer(goodAnswers(), { question: 'other_strategies', options: ['none'] });
    expect(dimension(none, 'calma')?.contributions[1]?.score).toBe(0);
  });
});

describe('scoreAttempt · edad y condiciones', () => {
  it('la sección de calma no aplica antes de los 12 meses', () => {
    const result = scoreAttempt(DEFINITION, SPEC, 8, goodAnswers());
    // Sueño puntúa solo por las pantallas antes de dormir: las horas no tienen pauta a los 8 meses.
    expect(result.dimensions.map((d) => d.code)).toEqual(['sueno', 'pantalla_tiempo']);
    expect(result.dimensions[0]?.contributions.map((c) => c.question)).toEqual([
      'screens_before_bed',
      'device_in_bedroom',
    ]);
    expect(result.missingRequired).toEqual([]);
  });

  it('una pregunta condicional aparece solo si se cumple la condición', () => {
    const codes = (answers: AnswerInput[]) =>
      visibleQuestions(DEFINITION, FOUR_YEARS, answers).map((l) => l.question.code);
    expect(codes(goodAnswers())).not.toContain('reaction_turn_off');
    const often = withAnswer(goodAnswers(), { question: 'device_to_calm', options: ['often'] });
    expect(codes(often)).toContain('reaction_turn_off');
  });

  it('si la pregunta de la que depende no se respondió, la condicional no se muestra', () => {
    const answers = goodAnswers().filter((a) => a.question !== 'device_to_calm');
    expect(
      visibleQuestions(DEFINITION, FOUR_YEARS, answers).map((l) => l.question.code),
    ).not.toContain('reaction_turn_off');
  });

  it('la condicional respeta además su propia edad mínima', () => {
    const often = withAnswer(goodAnswers(), { question: 'device_to_calm', options: ['often'] });
    expect(visibleQuestions(DEFINITION, 18, often).map((l) => l.question.code)).not.toContain(
      'reaction_turn_off',
    );
  });

  it('una respuesta a una pregunta oculta no cuenta', () => {
    const answers = [...goodAnswers(), { question: 'reaction_turn_off', options: ['intense'] }];
    expect(dimension(answers, 'calma')?.contributions.map((c) => c.question)).toEqual([
      'device_to_calm',
      'other_strategies',
    ]);
    const recs = recommend(
      DEFINITION,
      SPEC,
      FOUR_YEARS,
      answers,
      scoreAttempt(DEFINITION, SPEC, FOUR_YEARS, answers),
    );
    expect(recs.map((r) => r.rule)).not.toContain('turn_off');
  });
});

describe('scoreAttempt · respuestas faltantes o inválidas', () => {
  it('informa las obligatorias visibles sin responder', () => {
    const answers = goodAnswers().filter(
      (a) => a.question !== 'sleep_hours' && a.question !== 'device_in_bedroom',
    );
    const often = withAnswer(answers, { question: 'device_to_calm', options: ['often'] });
    expect(scoreAttempt(DEFINITION, SPEC, FOUR_YEARS, often).missingRequired).toEqual([
      'sleep_hours',
      'reaction_turn_off',
    ]);
  });

  it('una dimensión sin respuestas no tiene resultado', () => {
    const answers = goodAnswers().filter((a) => a.question !== 'screen_weekday');
    expect(dimension(answers, 'pantalla_tiempo')).toBeUndefined();
  });

  it('ignora preguntas y opciones desconocidas', () => {
    const answers = [
      ...goodAnswers(),
      { question: 'no_existe', options: ['x'] },
      { question: 'screen_weekday', options: ['inventada'] },
    ];
    expect(scoreAttempt(DEFINITION, SPEC, FOUR_YEARS, answers)).toEqual(
      scoreAttempt(DEFINITION, SPEC, FOUR_YEARS, goodAnswers()),
    );
  });

  it('una opción única con dos opciones elegidas cuenta como sin responder', () => {
    const answers = [...goodAnswers(), { question: 'screens_before_bed', options: ['daily'] }];
    expect(scoreAttempt(DEFINITION, SPEC, FOUR_YEARS, answers).missingRequired).toContain(
      'screens_before_bed',
    );
  });

  it('un número no finito cuenta como sin responder', () => {
    const answers = withAnswer(goodAnswers(), { question: 'sleep_hours', value: Number.NaN });
    expect(scoreAttempt(DEFINITION, SPEC, FOUR_YEARS, answers).missingRequired).toEqual([
      'sleep_hours',
    ]);
  });
});

describe('recommend', () => {
  function recsFor(answers: AnswerInput[], age = FOUR_YEARS) {
    return recommend(DEFINITION, SPEC, age, answers, scoreAttempt(DEFINITION, SPEC, age, answers));
  }

  it('sin nada para mirar, sugiere solo la regla general', () => {
    expect(recsFor(goodAnswers()).map((r) => r.rule)).toEqual(['general']);
  });

  it('combina banda y respuesta', () => {
    const answers = withAnswer(
      withAnswer(goodAnswers(), { question: 'device_in_bedroom', options: ['yes'] }),
      { question: 'screens_before_bed', options: ['daily'] },
    );
    // (100 + 0 + 0) / 3 = 33 → priority
    expect(recsFor(answers)[0]).toEqual({
      rule: 'devices_out',
      target: { contentSlug: 'sueno-y-pantallas' },
      priority: 1,
      reason: 'Hay dispositivos en el dormitorio.',
    });
  });

  it('no se activa si la banda no coincide aunque la respuesta sí', () => {
    const answers = withAnswer(goodAnswers(), { question: 'device_in_bedroom', options: ['yes'] });
    // (100 + 100 + 0) / 3 = 67 → watch: sí aplica; con 11 h y "never" sigue en watch
    expect(recsFor(answers).map((r) => r.rule)).toContain('devices_out');
    const good = withAnswer(goodAnswers(), { question: 'device_in_bedroom', options: ['no'] });
    expect(recsFor(good).map((r) => r.rule)).not.toContain('devices_out');
  });

  it('ordena por prioridad, quita destinos repetidos y respeta el tope', () => {
    const answers = withAnswer(
      withAnswer(withAnswer(goodAnswers(), { question: 'device_to_calm', options: ['always'] }), {
        question: 'other_strategies',
        options: ['none'],
      }),
      { question: 'reaction_turn_off', options: ['intense'] },
    );
    const recs = recsFor([...answers]);
    expect(recs.map((r) => r.rule)).toEqual(['turn_off', 'calm_alternatives', 'general']);
  });

  it('filtra por edad', () => {
    expect(recsFor(goodAnswers(), 18).map((r) => r.rule)).toEqual(['little_ones', 'general']);
  });
});

describe('determinismo (propiedad)', () => {
  /** Generador pseudoaleatorio con semilla: los casos son siempre los mismos. */
  function random(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) % 2 ** 31;
      return state / 2 ** 31;
    };
  }

  function randomAnswers(next: () => number): AnswerInput[] {
    const answers: AnswerInput[] = [];
    for (const section of DEFINITION.sections) {
      for (const question of section.questions) {
        if (next() < 0.15) continue;
        if (question.type === 'number') {
          answers.push({ question: question.code, value: Math.round(next() * 48) / 2 });
        } else {
          const picked = question.options.filter(() => next() < 0.4).map((o) => o.code);
          const first = question.options[Math.floor(next() * question.options.length)]?.code;
          answers.push({
            question: question.code,
            options: question.type === 'single' ? [first ?? ''] : picked,
          });
        }
      }
    }
    return answers;
  }

  it('las mismas respuestas dan el mismo resultado, en cualquier orden', () => {
    const next = random(42);
    for (let i = 0; i < 300; i += 1) {
      const age = Math.floor(next() * 217);
      const answers = randomAnswers(next);
      const shuffled = [...answers].sort(() => next() - 0.5);
      const first = scoreAttempt(DEFINITION, SPEC, age, answers);
      const again = scoreAttempt(DEFINITION, SPEC, age, shuffled);
      expect(again).toEqual(first);
      expect(recommend(DEFINITION, SPEC, age, shuffled, again)).toEqual(
        recommend(DEFINITION, SPEC, age, answers, first),
      );
      for (const d of first.dimensions) {
        expect(d.normalized).toBeGreaterThanOrEqual(0);
        expect(d.normalized).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('answersFromRows', () => {
  it('traduce ids a códigos e ignora lo desconocido', () => {
    expect(
      answersFromRows(DEFINITION, [
        { questionId: 'q-sleep', optionId: null, valueNumber: 10.5 },
        { questionId: 'q-bed', optionId: 'o-bed-some', valueNumber: null },
        { questionId: 'q-bed', optionId: 'otra', valueNumber: null },
        { questionId: 'desconocida', optionId: null, valueNumber: 3 },
      ]),
    ).toEqual([
      { question: 'sleep_hours', value: 10.5 },
      { question: 'screens_before_bed', options: ['sometimes'] },
    ]);
  });
});

describe('checkSpecAgainstDefinition', () => {
  it('la especificación de prueba es coherente', () => {
    expect(checkSpecAgainstDefinition(DEFINITION, SPEC)).toEqual([]);
  });

  it('detecta referencias rotas', () => {
    const spec = ScoringSpecSchema.parse({
      ...SPEC,
      questionScoring: { ...SPEC.questionScoring, inventada: { type: 'option_value' } },
      recommendations: [
        {
          code: 'mala',
          when: { answer: { screens_before_bed: 'quizas' } },
          target: { contentSlug: 'x' },
          priority: 1,
          reason: 'x',
        },
      ],
    });
    expect(checkSpecAgainstDefinition(DEFINITION, spec)).toEqual([
      'questionScoring: pregunta desconocida "inventada"',
      'mala: opción "quizas"',
    ]);
  });

  it('rechaza una regla que no corresponde al tipo de pregunta', () => {
    const spec = {
      ...SPEC,
      questionScoring: { other_strategies: { type: 'option_value' as const } },
    };
    expect(checkSpecAgainstDefinition(DEFINITION, spec)).toEqual([
      'questionScoring.other_strategies: option_value no aplica a "multi"',
    ]);
  });

  it('exige cortes crecientes que terminen en 100', () => {
    const result = ScoringSpecSchema.safeParse({
      ...SPEC,
      dimensions: [
        {
          ...SPEC.dimensions[0],
          bands: [
            { max: 60, band: 'watch' },
            { max: 40, band: 'strength' },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('findClinicalTerms', () => {
  it.each([
    ['Puede ser un trastorno del sueño', ['trastorno']],
    ['Señales de ADICCIÓN', ['adiccion']],
    ['Diagnóstico', ['diagnos']],
    ['Hay rutinas que ayudan a dormir mejor', []],
    ['Pocas actividades al aire libre', []],
  ])('"%s"', (text, expected) => {
    expect(findClinicalTerms(text)).toEqual(expected);
  });
});
