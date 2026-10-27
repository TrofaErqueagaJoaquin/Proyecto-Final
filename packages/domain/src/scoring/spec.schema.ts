import { z } from 'zod';

/**
 * Esquemas del cuestionario y de su especificación de puntuación (IMPLEMENTATION_PLAN.md §4).
 *
 * - `QuestionnaireDefinitionSchema`: secciones, preguntas y opciones. Es lo que devuelve
 *   `questionnaire_definition()` en la base y lo que la app usa para mostrar las preguntas.
 * - `ScoringSpecSchema`: cómo se puntúa cada pregunta, las bandas por dimensión y las reglas
 *   de recomendación. Se guarda tal cual en `questionnaire_versions.scoring_spec`.
 * - `QuestionnaireFileSchema`: el archivo de `content/questionnaires/`, que junta las dos cosas
 *   y valida que se refieran entre sí correctamente.
 */

export const BANDS = ['strength', 'watch', 'priority'] as const;
export const BandSchema = z.enum(BANDS);
export type Band = z.infer<typeof BandSchema>;

const CodeSchema = z.string().regex(/^[a-z][a-z0-9_]*$/, 'código en minúsculas y guiones bajos');
const AgeMonthsSchema = z.number().int().min(0).max(216);

// ── Definición (lo que se pregunta) ─────────────────────────────────────

export const ShowIfSchema = z
  .object({
    question: CodeSchema,
    anyOf: z.array(CodeSchema).min(1).optional(),
    noneOf: z.array(CodeSchema).min(1).optional(),
  })
  .refine((s) => (s.anyOf === undefined) !== (s.noneOf === undefined), {
    message: 'showIf necesita anyOf o noneOf (uno solo)',
  });
export type ShowIf = z.infer<typeof ShowIfSchema>;

export const OptionSchema = z.object({
  id: z.string().optional(),
  code: CodeSchema,
  label: z.string().min(1).max(120),
  value: z.number(),
});
export type Option = z.infer<typeof OptionSchema>;

export const NumberConfigSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    unit: z.string().min(1).max(20),
  })
  .refine((n) => n.min < n.max, { message: 'min tiene que ser menor que max' });

export const QuestionSchema = z
  .object({
    id: z.string().optional(),
    code: CodeSchema,
    prompt: z.string().min(1).max(200),
    help: z.string().max(300).optional(),
    type: z.enum(['single', 'multi', 'number']),
    required: z.boolean().default(true),
    minAgeMonths: AgeMonthsSchema.optional(),
    maxAgeMonths: AgeMonthsSchema.optional(),
    showIf: ShowIfSchema.optional(),
    options: z.array(OptionSchema).default([]),
    number: NumberConfigSchema.optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === 'number' && !q.number) {
      ctx.addIssue({
        code: 'custom',
        message: `${q.code}: una pregunta numérica necesita "number"`,
      });
    }
    if (q.type !== 'number' && q.options.length < 2) {
      ctx.addIssue({ code: 'custom', message: `${q.code}: necesita al menos 2 opciones` });
    }
    if (q.type === 'number' && q.options.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `${q.code}: una pregunta numérica no lleva opciones`,
      });
    }
    if (new Set(q.options.map((o) => o.code)).size !== q.options.length) {
      ctx.addIssue({ code: 'custom', message: `${q.code}: hay opciones repetidas` });
    }
  });
export type Question = z.infer<typeof QuestionSchema>;

export const SectionSchema = z.object({
  id: z.string().optional(),
  code: CodeSchema,
  title: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  minAgeMonths: AgeMonthsSchema.optional(),
  maxAgeMonths: AgeMonthsSchema.optional(),
  questions: z.array(QuestionSchema).min(1),
});
export type Section = z.infer<typeof SectionSchema>;

export const QuestionnaireDefinitionSchema = z.object({
  sections: z.array(SectionSchema).min(1),
});
export type QuestionnaireDefinition = z.infer<typeof QuestionnaireDefinitionSchema>;

// ── Puntuación ──────────────────────────────────────────────────────────

/** La opción elegida trae su puntaje (0 a 100). */
const OptionValueRule = z.object({ type: z.literal('option_value') });

/** Suma de los valores de las opciones elegidas, con tope. */
const MultiSumRule = z.object({
  type: z.literal('multi_sum'),
  cap: z.number().positive().max(100).default(100),
});

/**
 * Un número (o el valor de la opción elegida) comparado con un rango ideal según la edad.
 * Si la edad no cae en ningún rango, la pregunta es solo descriptiva y no puntúa.
 */
const AgeRangeRule = z.object({
  type: z.literal('age_range'),
  ranges: z
    .array(
      z.object({
        ageMonths: z.tuple([AgeMonthsSchema, AgeMonthsSchema]),
        ideal: z.tuple([z.number(), z.number()]),
      }),
    )
    .min(1),
  /** Hasta cuánto fuera del rango ideal cuenta como "cerca". */
  tolerance: z.number().min(0),
  inside: z.number().min(0).max(100).default(100),
  near: z.number().min(0).max(100).default(60),
  outside: z.number().min(0).max(100).default(20),
});

export const QuestionRuleSchema = z.discriminatedUnion('type', [
  OptionValueRule,
  MultiSumRule,
  AgeRangeRule,
]);
export type QuestionRule = z.infer<typeof QuestionRuleSchema>;

export const DimensionSpecSchema = z
  .object({
    /** Mismo código que la sección: cada sección del cuestionario es una dimensión. */
    code: CodeSchema,
    aggregate: z.literal('mean').default('mean'),
    /** Cortes ascendentes: la banda es la primera cuyo `max` alcanza el puntaje (0 a 100). */
    bands: z.array(z.object({ max: z.number().int().min(0).max(100), band: BandSchema })).min(1),
    /** Explicación de dos líneas por banda, sin vocabulario clínico. */
    texts: z.object({
      strength: z.string().min(1).max(280),
      watch: z.string().min(1).max(280),
      priority: z.string().min(1).max(280),
    }),
  })
  .superRefine((d, ctx) => {
    const maxes = d.bands.map((b) => b.max);
    if (maxes.some((max, i) => i > 0 && max <= (maxes[i - 1] ?? -1))) {
      ctx.addIssue({ code: 'custom', message: `${d.code}: los cortes tienen que ser crecientes` });
    }
    if (maxes.at(-1) !== 100) {
      ctx.addIssue({ code: 'custom', message: `${d.code}: el último corte tiene que ser 100` });
    }
  });
export type DimensionSpec = z.infer<typeof DimensionSpecSchema>;

export const RecommendationTargetSchema = z.union([
  z.object({ contentSlug: z.string().min(1) }).strict(),
  z.object({ activitySlug: z.string().min(1) }).strict(),
]);
export type RecommendationTarget = z.infer<typeof RecommendationTargetSchema>;

export const RecommendationRuleSchema = z.object({
  code: CodeSchema,
  /** Todas las condiciones presentes tienen que cumplirse. */
  when: z
    .object({
      dimension: CodeSchema.optional(),
      bandIn: z.array(BandSchema).min(1).optional(),
      /** Pregunta → opción (o alguna de varias opciones) elegida. */
      answer: z.record(CodeSchema, z.union([CodeSchema, z.array(CodeSchema).min(1)])).optional(),
      minAgeMonths: AgeMonthsSchema.optional(),
      maxAgeMonths: AgeMonthsSchema.optional(),
    })
    .refine((w) => (w.bandIn === undefined) === (w.dimension === undefined), {
      message: 'bandIn y dimension van juntos',
    }),
  target: RecommendationTargetSchema,
  /** 1 es lo más importante. */
  priority: z.number().int().min(1).max(5),
  /** "Por qué" se sugiere, en lenguaje cotidiano. */
  reason: z.string().min(1).max(200),
});
export type RecommendationRule = z.infer<typeof RecommendationRuleSchema>;

export const ScoringSpecSchema = z.object({
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  dimensions: z.array(DimensionSpecSchema).min(1),
  questionScoring: z.record(CodeSchema, QuestionRuleSchema),
  recommendations: z.array(RecommendationRuleSchema),
  maxRecommendations: z.number().int().min(1).max(10).default(5),
});
export type ScoringSpec = z.infer<typeof ScoringSpecSchema>;

// ── Archivo de content/questionnaires ───────────────────────────────────

const EvidenceLabelSchema = z.enum([
  'recomendacion_oficial',
  'evidencia_consolidada',
  'asociacion_no_causa',
  'hipotesis',
  'opinion_profesional',
  'propuesta_proyecto',
]);

/** Errores de coherencia entre la definición y la especificación (vacío si está bien). */
export function checkSpecAgainstDefinition(
  definition: QuestionnaireDefinition,
  spec: ScoringSpec,
): string[] {
  const errors: string[] = [];
  const questions = new Map<string, Question>();
  const order = new Map<string, number>();
  for (const section of definition.sections) {
    for (const question of section.questions) {
      if (questions.has(question.code)) errors.push(`pregunta repetida "${question.code}"`);
      order.set(question.code, order.size);
      questions.set(question.code, question);
    }
  }
  const sectionCodes = definition.sections.map((s) => s.code);
  if (new Set(sectionCodes).size !== sectionCodes.length) errors.push('hay secciones repetidas');

  const dimensionCodes = new Set(spec.dimensions.map((d) => d.code));
  for (const code of sectionCodes) {
    if (!dimensionCodes.has(code)) errors.push(`la sección "${code}" no tiene dimensión`);
  }
  for (const code of dimensionCodes) {
    if (!sectionCodes.includes(code)) errors.push(`la dimensión "${code}" no tiene sección`);
  }

  const hasOption = (questionCode: string, optionCode: string) =>
    questions.get(questionCode)?.options.some((o) => o.code === optionCode) ?? false;

  for (const question of questions.values()) {
    if (!question.showIf) continue;
    const ref = question.showIf.question;
    if ((order.get(ref) ?? Infinity) >= (order.get(question.code) ?? -1)) {
      errors.push(`${question.code}: showIf tiene que apuntar a una pregunta anterior`);
      continue;
    }
    for (const option of question.showIf.anyOf ?? question.showIf.noneOf ?? []) {
      if (!hasOption(ref, option)) errors.push(`${question.code}: showIf usa "${option}"`);
    }
  }

  for (const [code, rule] of Object.entries(spec.questionScoring)) {
    const question = questions.get(code);
    if (!question) {
      errors.push(`questionScoring: pregunta desconocida "${code}"`);
      continue;
    }
    const allowed = {
      option_value: ['single'],
      multi_sum: ['multi'],
      age_range: ['single', 'number'],
    }[rule.type];
    if (!allowed.includes(question.type)) {
      errors.push(`questionScoring.${code}: ${rule.type} no aplica a "${question.type}"`);
    }
    if (rule.type !== 'age_range' && question.options.some((o) => o.value < 0 || o.value > 100)) {
      errors.push(`${code}: los valores de las opciones van de 0 a 100`);
    }
  }

  for (const rule of spec.recommendations) {
    if (rule.when.dimension && !dimensionCodes.has(rule.when.dimension)) {
      errors.push(`${rule.code}: dimensión desconocida "${rule.when.dimension}"`);
    }
    for (const [questionCode, expected] of Object.entries(rule.when.answer ?? {})) {
      if (!questions.has(questionCode)) {
        errors.push(`${rule.code}: pregunta desconocida "${questionCode}"`);
        continue;
      }
      for (const option of [expected].flat()) {
        if (!hasOption(questionCode, option)) errors.push(`${rule.code}: opción "${option}"`);
      }
    }
  }
  const ruleCodes = spec.recommendations.map((r) => r.code);
  if (new Set(ruleCodes).size !== ruleCodes.length) errors.push('hay reglas repetidas');
  return errors;
}

export const QuestionnaireFileSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(400),
    version: z.number().int().positive(),
    evidenceLabel: EvidenceLabelSchema,
    estimatedMinutes: z.number().int().min(1).max(60),
    minAgeMonths: AgeMonthsSchema,
    maxAgeMonths: AgeMonthsSchema,
    sections: QuestionnaireDefinitionSchema.shape.sections,
    scoring: ScoringSpecSchema,
  })
  .superRefine((file, ctx) => {
    for (const message of checkSpecAgainstDefinition({ sections: file.sections }, file.scoring)) {
      ctx.addIssue({ code: 'custom', message });
    }
  });
export type QuestionnaireFile = z.infer<typeof QuestionnaireFileSchema>;
