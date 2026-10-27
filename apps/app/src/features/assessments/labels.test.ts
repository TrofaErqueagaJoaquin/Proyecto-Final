import { findClinicalTerms, QuestionnaireDefinitionSchema } from '@crecer/domain';

import {
  BAND_LABELS,
  contentHref,
  describeChange,
  RECOMMENDATION_STATUS_LABELS,
  weighedAnswers,
} from './labels';

describe('textos del resultado', () => {
  it('no usan vocabulario clínico', () => {
    const texts = [...Object.values(BAND_LABELS), ...Object.values(RECOMMENDATION_STATUS_LABELS)];
    for (const text of texts) expect(findClinicalTerms(text)).toEqual([]);
  });
});

describe('describeChange', () => {
  it('describe el cambio entre dos intentos en palabras', () => {
    expect(describeChange('Sueño', 'watch', 'strength')).toBe(
      'Sueño pasó de Para mirar a Fortaleza.',
    );
    expect(describeChange('Calma', 'priority', 'priority')).toBe(
      'Calma sigue en Por dónde empezar.',
    );
  });

  it('sin intento anterior (o sin resultado) no compara', () => {
    expect(describeChange('Sueño', undefined, 'watch')).toBeNull();
    expect(describeChange('Sueño', 'watch', undefined)).toBeNull();
  });
});

describe('contentHref', () => {
  it.each([
    ['age_stage', 'etapa-3-5', '/etapas/etapa-3-5'],
    ['situation_card', 'ficha-c-reaccion-al-apagar', '/situaciones/ficha-c-reaccion-al-apagar'],
    ['when_to_consult', 'cuando-consultar', '/cuando-consultar'],
    ['guide', 'x', null],
  ] as const)('%s → %s', (type, slug, href) => {
    expect(contentHref(type, slug)).toBe(href);
  });
});

describe('weighedAnswers', () => {
  const definition = QuestionnaireDefinitionSchema.parse({
    sections: [
      {
        code: 'sueno',
        title: 'Sueño',
        questions: [
          {
            code: 'sleep_hours',
            prompt: '¿Cuántas horas duerme?',
            type: 'number',
            number: { min: 0, max: 24, step: 0.5, unit: 'horas' },
          },
          {
            code: 'screens_before_bed',
            prompt: '¿Pantallas antes de dormir?',
            type: 'single',
            options: [
              { code: 'never', label: 'Casi nunca', value: 100 },
              { code: 'most_days', label: 'La mayoría de los días', value: 0 },
            ],
          },
          {
            code: 'device_in_bedroom',
            prompt: '¿Dispositivos en el dormitorio?',
            type: 'single',
            options: [
              { code: 'no', label: 'No', value: 100 },
              { code: 'yes', label: 'Sí', value: 0 },
            ],
          },
        ],
      },
    ],
  });

  it('muestra las respuestas que más bajaron el resultado, de menor a mayor puntaje', () => {
    expect(
      weighedAnswers(
        definition,
        [
          { question: 'sleep_hours', value: 9.5 },
          { question: 'screens_before_bed', options: ['most_days'] },
          { question: 'device_in_bedroom', options: ['no'] },
        ],
        [
          { question: 'sleep_hours', score: 60 },
          { question: 'screens_before_bed', score: 0 },
          { question: 'device_in_bedroom', score: 100 },
        ],
      ),
    ).toEqual([
      {
        question: 'screens_before_bed',
        prompt: '¿Pantallas antes de dormir?',
        answer: 'La mayoría de los días',
      },
      { question: 'sleep_hours', prompt: '¿Cuántas horas duerme?', answer: '9,5 horas' },
    ]);
  });

  it('si todo suma, no hay nada que mostrar', () => {
    expect(weighedAnswers(definition, [], [{ question: 'device_in_bedroom', score: 100 }])).toEqual(
      [],
    );
  });
});
