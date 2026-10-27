import type { AnswerInput, Band, Contribution, QuestionnaireDefinition } from '@crecer/domain';

// Textos del resultado: orientativos y sin vocabulario clínico (lo verifica labels.test.ts).
// Las bandas nunca usan el color de peligro (UX_AND_NAVIGATION.md §1.2).

export const BAND_LABELS: Record<Band, string> = {
  strength: 'Fortaleza',
  watch: 'Para mirar',
  priority: 'Por dónde empezar',
};

export const RECOMMENDATION_STATUS_LABELS = {
  new: 'Nueva',
  accepted: 'La vamos a probar',
  done: 'Ya la hicimos',
  dismissed: 'No es para nosotros',
} as const;
export type RecommendationStatus = keyof typeof RECOMMENDATION_STATUS_LABELS;

/** Puntaje por debajo del cual una respuesta "pesó" en el resultado. */
const WEIGHED_BELOW = 70;

/** "Sueño pasó de Para mirar a Fortaleza." · null si no hay con qué comparar. */
export function describeChange(
  title: string,
  previous: Band | undefined,
  current: Band | undefined,
): string | null {
  if (!previous || !current) return null;
  if (previous === current) return `${title} sigue en ${BAND_LABELS[current]}.`;
  return `${title} pasó de ${BAND_LABELS[previous]} a ${BAND_LABELS[current]}.`;
}

/** Ruta pública de un contenido de la biblioteca según su tipo (null si no tiene pantalla). */
export function contentHref(type: string, slug: string): string | null {
  switch (type) {
    case 'age_stage':
      return `/etapas/${slug}`;
    case 'situation_card':
      return `/situaciones/${slug}`;
    case 'when_to_consult':
      return '/cuando-consultar';
    default:
      return null;
  }
}

function formatNumber(value: number): string {
  return String(value).replace('.', ',');
}

/**
 * "Qué pesó": las respuestas con menor puntaje de una dimensión, con la pregunta y lo que se
 * respondió, para que el resultado sea transparente.
 */
export function weighedAnswers(
  definition: QuestionnaireDefinition,
  answers: readonly AnswerInput[],
  contributions: readonly Contribution[],
  limit = 3,
): { question: string; prompt: string; answer: string }[] {
  const questions = new Map(
    definition.sections.flatMap((s) => s.questions).map((q) => [q.code, q]),
  );
  return [...contributions]
    .filter((c) => c.score < WEIGHED_BELOW)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .flatMap((c) => {
      const question = questions.get(c.question);
      if (!question) return [];
      const given = answers.filter((a) => a.question === c.question);
      const codes = given.flatMap((a) => a.options ?? []);
      const value = given.find((a) => typeof a.value === 'number')?.value;
      const answer =
        question.type === 'number'
          ? value === undefined || value === null
            ? ''
            : `${formatNumber(value)} ${question.number?.unit ?? ''}`.trim()
          : question.options
              .filter((o) => codes.includes(o.code))
              .map((o) => o.label)
              .join(', ');
      return [{ question: c.question, prompt: question.prompt, answer }];
    });
}
