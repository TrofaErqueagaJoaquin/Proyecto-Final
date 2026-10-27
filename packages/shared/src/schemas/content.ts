import { z } from 'zod';

// Valida los archivos de content/ (fuente del contenido inicial; ADR-014) y da etiquetas a la app.

export const EVIDENCE_LABELS = {
  recomendacion_oficial: {
    label: 'Recomendación oficial',
    description: 'Guía de un organismo (OMS, SAP, AAP) basada en revisiones de la evidencia.',
  },
  evidencia_consolidada: {
    label: 'Evidencia consolidada',
    description: 'Varias revisiones o ensayos concuerdan.',
  },
  asociacion_no_causa: {
    label: 'Asociación, no causa',
    description:
      'Dos cosas aparecen juntas en estudios observacionales; no prueba que una cause la otra.',
  },
  hipotesis: {
    label: 'Hipótesis',
    description: 'Mecanismo plausible sin prueba directa.',
  },
  opinion_profesional: {
    label: 'Opinión profesional',
    description: 'Consenso o experiencia clínica, sin estudios que lo comparen.',
  },
  propuesta_proyecto: {
    label: 'Propuesta del proyecto',
    description: 'Idea práctica del equipo de Crecer en Casa, coherente con las fuentes citadas.',
  },
} as const;
export type EvidenceLabel = keyof typeof EVIDENCE_LABELS;
export const EvidenceLabelSchema = z.enum(
  Object.keys(EVIDENCE_LABELS) as [EvidenceLabel, ...EvidenceLabel[]],
);

/** Etapas de la biblioteca (docs/research §10). Edades en meses, inclusive. */
export const AGE_STAGES = [
  { slug: 'etapa-0-2', label: '0 a 2 años', minMonths: 0, maxMonths: 35 },
  { slug: 'etapa-3-5', label: '3 a 5 años', minMonths: 36, maxMonths: 71 },
  { slug: 'etapa-6-8', label: '6 a 8 años', minMonths: 72, maxMonths: 107 },
  { slug: 'etapa-9-11', label: '9 a 11 años', minMonths: 108, maxMonths: 143 },
  { slug: 'etapa-12-17', label: '12 a 17 años', minMonths: 144, maxMonths: 215 },
] as const;

const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug inválido (minúsculas y guiones).');
const AgeMonthsSchema = z.number().int().min(0).max(216);
const SourceRefSchema = z.object({ slug: SlugSchema, locator: z.string().optional() });

export const SourceFileSchema = z.object({
  slug: SlugSchema,
  citation: z.string().min(10),
  study_type: z.enum([
    'guideline',
    'meta_analysis',
    'systematic_review',
    'cohort',
    'rct',
    'cross_sectional',
    'statute',
    'report',
    'position_statement',
    'other',
  ]),
  year: z.number().int().min(1900).max(2100).optional(),
  doi: z.string().optional(),
  url: z.url().startsWith('https://').optional(),
  confidence: z.enum(['high', 'moderate', 'low', 'hypothesis']),
  verification_status: z.enum(['unverified', 'verified']).default('unverified'),
  notes: z.string().optional(),
});
export type SourceFile = z.infer<typeof SourceFileSchema>;

/** Markdown permitido: títulos ##/###, párrafos, listas "- " y **negrita**. Nunca HTML. */
export const SafeMarkdownSchema = z
  .string()
  .min(1)
  .refine((md) => !/<\/?[a-z][^>]*>/i.test(md), 'El contenido no puede incluir HTML.');

export const ContentFrontmatterSchema = z
  .object({
    slug: SlugSchema,
    type: z.enum([
      'guide',
      'age_stage',
      'situation_card',
      'when_to_consult',
      'local_resource',
      'glossary',
    ]),
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(400),
    age_min_months: AgeMonthsSchema.optional(),
    age_max_months: AgeMonthsSchema.optional(),
    evidence_label: EvidenceLabelSchema,
    sort_order: z.number().int().default(0),
    sources: z.array(SourceRefSchema).default([]),
  })
  .refine(
    (c) =>
      c.age_min_months === undefined ||
      c.age_max_months === undefined ||
      c.age_min_months <= c.age_max_months,
    { message: 'age_min_months no puede superar a age_max_months.' },
  );
export type ContentFrontmatter = z.infer<typeof ContentFrontmatterSchema>;

export const ActivityFileSchema = z
  .object({
    slug: SlugSchema,
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(400),
    objective: z.string().min(1),
    age_min_months: AgeMonthsSchema,
    age_max_months: AgeMonthsSchema,
    duration_min: z.number().int().min(1).max(240),
    participants_min: z.number().int().min(1).default(1),
    participants_max: z.number().int().min(1).optional(),
    cost_level: z.enum(['free', 'low', 'medium']),
    space: z.enum(['small_indoor', 'indoor', 'outdoor']),
    categories: z.array(z.string()).min(1),
    materials: z.array(z.string()).default([]),
    steps: z.array(z.string().min(1).max(500)).min(1),
    variants: z.array(z.string()).default([]),
    accessibility_notes: z.array(z.string()).default([]),
    safety_notes: z.string().optional(),
    evidence_label: EvidenceLabelSchema,
    sources: z.array(SourceRefSchema).default([]),
  })
  .refine((a) => a.age_min_months <= a.age_max_months, {
    message: 'age_min_months no puede superar a age_max_months.',
  });
export type ActivityFile = z.infer<typeof ActivityFileSchema>;

export const COST_LABELS = { free: 'Gratis', low: 'Costo bajo', medium: 'Costo medio' } as const;
export const SPACE_LABELS = {
  small_indoor: 'Espacio chico',
  indoor: 'Adentro',
  outdoor: 'Al aire libre',
} as const;
