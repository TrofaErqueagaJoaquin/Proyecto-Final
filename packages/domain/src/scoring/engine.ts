import type {
  Band,
  Question,
  QuestionnaireDefinition,
  QuestionRule,
  ScoringSpec,
  Section,
} from './spec.schema';

/**
 * Motor de puntuación: función pura de (definición, especificación, edad, respuestas).
 * Las mismas entradas dan siempre el mismo resultado, sin importar el orden de las respuestas;
 * por eso el resultado guardado se puede volver a explicar y verificar (ADR-027).
 */

export interface AnswerInput {
  question: string;
  options?: readonly string[];
  value?: number | null;
}

interface Answer {
  options: string[];
  value: number | null;
}

export interface Contribution {
  question: string;
  score: number;
}

export interface DimensionResult {
  code: string;
  /** Promedio sin redondear (dos decimales). */
  rawScore: number;
  /** 0 a 100, entero. */
  normalized: number;
  band: Band;
  /** Qué preguntas pesaron y cuánto, en el orden del cuestionario. */
  contributions: Contribution[];
}

export interface AttemptResult {
  engineVersion: string;
  dimensions: DimensionResult[];
  /** Preguntas obligatorias visibles sin responder. */
  missingRequired: string[];
}

interface Located {
  section: Section;
  question: Question;
}

function inAgeRange(ageMonths: number, min?: number, max?: number): boolean {
  return (min === undefined || ageMonths >= min) && (max === undefined || ageMonths <= max);
}

function allQuestions(definition: QuestionnaireDefinition): Located[] {
  return definition.sections.flatMap((section) =>
    section.questions.map((question) => ({ section, question })),
  );
}

/** Junta respuestas repetidas, descarta opciones inexistentes y ordena (entrada canónica). */
function normalizeAnswers(
  definition: QuestionnaireDefinition,
  inputs: readonly AnswerInput[],
): Map<string, Answer> {
  const questions = new Map(allQuestions(definition).map((l) => [l.question.code, l.question]));
  const answers = new Map<string, Answer>();
  for (const input of inputs) {
    const question = questions.get(input.question);
    if (!question) continue;
    const current = answers.get(question.code) ?? { options: [], value: null };
    const valid = new Set(question.options.map((o) => o.code));
    const options = [...new Set([...current.options, ...(input.options ?? [])])].filter((code) =>
      valid.has(code),
    );
    const value =
      typeof input.value === 'number' && Number.isFinite(input.value) ? input.value : current.value;
    answers.set(question.code, { options: options.sort(), value });
  }
  return answers;
}

function hasAnswer(question: Question, answer: Answer | undefined): answer is Answer {
  if (!answer) return false;
  switch (question.type) {
    case 'single':
      return answer.options.length === 1;
    case 'multi':
      return answer.options.length > 0;
    case 'number':
      return answer.value !== null;
  }
}

/** Preguntas que corresponden a la edad y cuya condición (showIf) se cumple, en orden. */
function visibleWith(
  definition: QuestionnaireDefinition,
  ageMonths: number,
  answers: Map<string, Answer>,
): Located[] {
  const visible = new Map<string, Located>();
  for (const located of allQuestions(definition)) {
    const { section, question } = located;
    if (!inAgeRange(ageMonths, section.minAgeMonths, section.maxAgeMonths)) continue;
    if (!inAgeRange(ageMonths, question.minAgeMonths, question.maxAgeMonths)) continue;
    if (question.showIf) {
      const ref = visible.get(question.showIf.question);
      const answer = answers.get(question.showIf.question);
      // Si la pregunta de la que depende no se ve o no se respondió, esta tampoco se muestra.
      if (!ref || !hasAnswer(ref.question, answer)) continue;
      const chosen = answer.options;
      const { anyOf, noneOf } = question.showIf;
      if (anyOf && !anyOf.some((code) => chosen.includes(code))) continue;
      if (noneOf?.some((code) => chosen.includes(code))) continue;
    }
    visible.set(question.code, located);
  }
  return [...visible.values()];
}

/** Para la pantalla de respuesta: qué preguntas mostrar con las respuestas actuales. */
export function visibleQuestions(
  definition: QuestionnaireDefinition,
  ageMonths: number,
  inputs: readonly AnswerInput[],
): Located[] {
  return visibleWith(definition, ageMonths, normalizeAnswers(definition, inputs));
}

/** Respuestas que cuentan: de preguntas visibles y completas. */
function effectiveAnswers(
  definition: QuestionnaireDefinition,
  ageMonths: number,
  inputs: readonly AnswerInput[],
): { visible: Located[]; answers: Map<string, Answer> } {
  const all = normalizeAnswers(definition, inputs);
  const visible = visibleWith(definition, ageMonths, all);
  const answers = new Map<string, Answer>();
  for (const { question } of visible) {
    const answer = all.get(question.code);
    if (hasAnswer(question, answer)) answers.set(question.code, answer);
  }
  return { visible, answers };
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function scoreQuestion(
  question: Question,
  rule: QuestionRule,
  answer: Answer,
  ageMonths: number,
): number | null {
  const optionValue = (code: string | undefined) =>
    question.options.find((o) => o.code === code)?.value ?? null;

  switch (rule.type) {
    case 'option_value': {
      const value = optionValue(answer.options[0]);
      return value === null ? null : clamp(value);
    }
    case 'multi_sum': {
      const sum = answer.options.reduce((total, code) => total + (optionValue(code) ?? 0), 0);
      return clamp((Math.min(sum, rule.cap) / rule.cap) * 100);
    }
    case 'age_range': {
      const value = question.type === 'number' ? answer.value : optionValue(answer.options[0]);
      const range = rule.ranges.find(
        (r) => ageMonths >= r.ageMonths[0] && ageMonths <= r.ageMonths[1],
      );
      // Fuera de los rangos con pauta: la pregunta es descriptiva y no puntúa.
      if (value === null || !range) return null;
      const [low, high] = range.ideal;
      if (value >= low && value <= high) return rule.inside;
      const distance = value < low ? low - value : value - high;
      return distance <= rule.tolerance ? rule.near : rule.outside;
    }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scoreAttempt(
  definition: QuestionnaireDefinition,
  spec: ScoringSpec,
  ageMonths: number,
  inputs: readonly AnswerInput[],
): AttemptResult {
  const { visible, answers } = effectiveAnswers(definition, ageMonths, inputs);
  const missingRequired = visible
    .filter(({ question }) => question.required && !answers.has(question.code))
    .map(({ question }) => question.code);

  const dimensions: DimensionResult[] = [];
  for (const dimension of spec.dimensions) {
    const contributions: Contribution[] = [];
    for (const { section, question } of visible) {
      if (section.code !== dimension.code) continue;
      const rule = spec.questionScoring[question.code];
      const answer = answers.get(question.code);
      if (!rule || !answer) continue;
      const score = scoreQuestion(question, rule, answer, ageMonths);
      if (score !== null) contributions.push({ question: question.code, score: round2(score) });
    }
    // Sin preguntas que puntúen (por la edad o porque no se respondieron) no hay resultado.
    if (contributions.length === 0) continue;
    const mean = contributions.reduce((sum, c) => sum + c.score, 0) / contributions.length;
    const normalized = Math.round(mean);
    const band = dimension.bands.find((b) => normalized <= b.max)?.band ?? 'strength';
    dimensions.push({
      code: dimension.code,
      rawScore: round2(mean),
      normalized,
      band,
      contributions,
    });
  }

  return { engineVersion: spec.engineVersion, dimensions, missingRequired };
}

export interface RecommendationResult {
  rule: string;
  target: ScoringSpec['recommendations'][number]['target'];
  priority: number;
  reason: string;
}

/** Recomendaciones por reglas: ordenadas por prioridad, sin destinos repetidos y con tope. */
export function recommend(
  definition: QuestionnaireDefinition,
  spec: ScoringSpec,
  ageMonths: number,
  inputs: readonly AnswerInput[],
  result: AttemptResult,
): RecommendationResult[] {
  const { answers } = effectiveAnswers(definition, ageMonths, inputs);
  const bands = new Map(result.dimensions.map((d) => [d.code, d.band]));

  const matches = spec.recommendations
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule: { when } }) => {
      if (!inAgeRange(ageMonths, when.minAgeMonths, when.maxAgeMonths)) return false;
      if (when.dimension && when.bandIn) {
        const band = bands.get(when.dimension);
        if (!band || !when.bandIn.includes(band)) return false;
      }
      return Object.entries(when.answer ?? {}).every(([question, expected]) => {
        const chosen = answers.get(question)?.options ?? [];
        return [expected].flat().some((code) => chosen.includes(code));
      });
    })
    .sort((a, b) => a.rule.priority - b.rule.priority || a.index - b.index);

  const seen = new Set<string>();
  const out: RecommendationResult[] = [];
  for (const { rule } of matches) {
    const key = JSON.stringify(rule.target);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      rule: rule.code,
      target: rule.target,
      priority: rule.priority,
      reason: rule.reason,
    });
    if (out.length === spec.maxRecommendations) break;
  }
  return out;
}

/** Filas de `assessment_answers` (por id) → respuestas por código. Ignora ids desconocidos. */
export function answersFromRows(
  definition: QuestionnaireDefinition,
  rows: readonly { questionId: string; optionId: string | null; valueNumber: number | null }[],
): AnswerInput[] {
  const byId = new Map(
    allQuestions(definition)
      .filter(({ question }) => question.id !== undefined)
      .map(({ question }) => [question.id, question]),
  );
  const out: AnswerInput[] = [];
  for (const row of rows) {
    const question = byId.get(row.questionId);
    if (!question) continue;
    if (row.optionId !== null) {
      const option = question.options.find((o) => o.id === row.optionId);
      if (option) out.push({ question: question.code, options: [option.code] });
    } else if (row.valueNumber !== null) {
      out.push({ question: question.code, value: row.valueNumber });
    }
  }
  return out;
}
