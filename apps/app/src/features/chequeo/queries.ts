import { useQuery } from '@tanstack/react-query';
import {
  Footprints,
  Handshake,
  HeartHandshake,
  Moon,
  MonitorSmartphone,
  type LucideIcon,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';

/**
 * Chequeos cortos (rediseño de 2026): el de 1 minuto al empezar y uno por tema para personalizar.
 * Son cuestionarios publicados como cualquier otro (content/questionnaires/*-v1.yaml) y se puntúan
 * con el mismo motor de reglas.
 */
export const QUICK_CHECK = 'chequeo';

export interface ThemeCheck {
  slug: string;
  /** Dimensión que mira: si salió "por dónde empezar" o "para mirar", se recomienda primero. */
  dimension: string;
  title: string;
  invite: string;
  icon: LucideIcon;
}

export const THEME_CHECKS: ThemeCheck[] = [
  {
    slug: 'tema-sueno',
    dimension: 'sueno',
    title: 'Sueño',
    invite: 'Contanos un poco más de las noches',
    icon: Moon,
  },
  {
    slug: 'tema-calma',
    dimension: 'calma',
    title: 'Calma',
    invite: '¿Qué pasa cuando se apaga la pantalla?',
    icon: HeartHandshake,
  },
  {
    slug: 'tema-pantallas',
    dimension: 'pantalla_contexto',
    title: 'Pantallas',
    invite: 'Cómo y con quién se usan',
    icon: MonitorSmartphone,
  },
  {
    slug: 'tema-movimiento',
    dimension: 'movimiento',
    title: 'Movimiento',
    invite: 'Cuánto se mueve en el día',
    icon: Footprints,
  },
  {
    slug: 'tema-acuerdos',
    dimension: 'acuerdos',
    title: 'Acuerdos en casa',
    invite: 'Las reglas y cómo las sostienen',
    icon: Handshake,
  },
];

/** Última versión publicada de un cuestionario por su slug. */
export function useQuestionnaireBySlug(slug: string) {
  return useQuery({
    queryKey: ['questionnaire', slug, 'current'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionnaire_versions')
        .select('id, version, questionnaires!inner (slug, title, description)')
        .eq('questionnaires.slug', slug)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Último resultado de cada dimensión de un integrante, sumando todos sus chequeos y evaluaciones:
 * sirve para decidir qué tema recomendar en grande.
 */
export function useLatestBands(memberId: string | undefined) {
  return useQuery({
    queryKey: ['member', memberId ?? '', 'bands'],
    enabled: memberId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select(
          'id, submitted_at, questionnaire_versions (questionnaires (slug)), assessment_dimension_scores (dimension_code, band)',
        )
        .eq('member_id', memberId ?? '')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      const bands = new Map<string, string>();
      const done = new Set<string>();
      for (const attempt of data) {
        const slug = attempt.questionnaire_versions?.questionnaires?.slug;
        if (slug) done.add(slug);
        for (const score of attempt.assessment_dimension_scores) {
          if (!bands.has(score.dimension_code)) bands.set(score.dimension_code, score.band);
        }
      }
      return { bands, done };
    },
  });
}

/** Tema a recomendar: el primero sin hacer cuya dimensión está "por dónde empezar" o "para mirar". */
export function nextTheme(
  bands: Map<string, string> | undefined,
  done: Set<string> | undefined,
): ThemeCheck | null {
  const pending = THEME_CHECKS.filter((t) => !done?.has(t.slug));
  const rank = (t: ThemeCheck) => {
    const band = bands?.get(t.dimension);
    return band === 'priority' ? 0 : band === 'watch' ? 1 : 2;
  };
  return [...pending].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

export interface CarriedAnswer {
  optionCodes: string[];
  value: number | null;
}

/**
 * Respuestas del último chequeo de 1 minuto del integrante, por código de pregunta: los chequeos
 * por tema repiten esas preguntas y así no se vuelven a hacer.
 */
export function useQuickAnswers(memberId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['member', memberId ?? '', 'quick-answers'],
    enabled: enabled && memberId !== undefined,
    queryFn: async (): Promise<Map<string, CarriedAnswer>> => {
      const attempt = await supabase
        .from('assessment_attempts')
        .select('id, questionnaire_versions!inner (questionnaires!inner (slug))')
        .eq('member_id', memberId ?? '')
        .eq('status', 'submitted')
        .eq('questionnaire_versions.questionnaires.slug', QUICK_CHECK)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (attempt.error) throw attempt.error;
      const carried = new Map<string, CarriedAnswer>();
      if (!attempt.data) return carried;

      const answers = await supabase
        .from('assessment_answers')
        .select('question_id, option_id, value_number')
        .eq('attempt_id', attempt.data.id);
      if (answers.error) throw answers.error;
      const questionIds = [...new Set(answers.data.map((a) => a.question_id))];
      const optionIds = answers.data.flatMap((a) => (a.option_id ? [a.option_id] : []));
      const [questions, options] = await Promise.all([
        supabase.from('questions').select('id, code').in('id', questionIds),
        optionIds.length > 0
          ? supabase.from('question_options').select('id, code').in('id', optionIds)
          : Promise.resolve({ data: [] as { id: string; code: string }[], error: null }),
      ]);
      if (questions.error) throw questions.error;
      if (options.error) throw options.error;
      const questionCode = new Map(questions.data.map((q) => [q.id, q.code]));
      const optionCode = new Map(options.data.map((o) => [o.id, o.code]));

      for (const answer of answers.data) {
        const code = questionCode.get(answer.question_id);
        if (!code) continue;
        const entry = carried.get(code) ?? { optionCodes: [], value: null };
        if (answer.value_number !== null) entry.value = answer.value_number;
        const option = answer.option_id ? optionCode.get(answer.option_id) : undefined;
        if (option) entry.optionCodes.push(option);
        carried.set(code, entry);
      }
      return carried;
    },
  });
}
