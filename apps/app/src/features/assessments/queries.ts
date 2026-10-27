import {
  QuestionnaireDefinitionSchema,
  ScoringSpecSchema,
  type QuestionnaireDefinition,
  type ScoringSpec,
} from '@crecer/domain';
import { SubmitAssessmentResponseSchema } from '@crecer/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

import type { RecommendationStatus } from './labels';

// Lecturas y respuestas directas a Supabase (RLS: solo owner/guardian de la familia).
// El envío va por la API, que puntúa con el motor de packages/domain y guarda el resultado.

const QUESTIONNAIRE_SLUG = 'habitos';

export const assessmentKeys = {
  current: ['questionnaire', QUESTIONNAIRE_SLUG, 'current'] as const,
  version: (versionId: string) => ['questionnaire', 'version', versionId] as const,
  attempts: (familyId: string) => ['family', familyId, 'assessments'] as const,
  attempt: (attemptId: string) => ['assessment', attemptId] as const,
  answers: (attemptId: string) => ['assessment', attemptId, 'answers'] as const,
  result: (attemptId: string) => ['assessment', attemptId, 'result'] as const,
  history: (memberId: string) => ['member', memberId, 'assessments'] as const,
};

export interface AnswerRow {
  question_id: string;
  option_id: string | null;
  value_number: number | null;
}

/** Última versión publicada del cuestionario de hábitos. */
export function useCurrentQuestionnaire() {
  return useQuery({
    queryKey: assessmentKeys.current,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionnaire_versions')
        .select(
          'id, version, estimated_minutes, min_age_months, max_age_months, evidence_label, questionnaires!inner (slug, title, description)',
        )
        .eq('questionnaires.slug', QUESTIONNAIRE_SLUG)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Definición y especificación de una versión (inmutable: se cachea sin vencimiento). */
export function useQuestionnaireVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.version(versionId ?? ''),
    enabled: versionId !== undefined,
    staleTime: Infinity,
    queryFn: async (): Promise<{ definition: QuestionnaireDefinition; spec: ScoringSpec }> => {
      const [definition, version] = await Promise.all([
        supabase.rpc('questionnaire_definition', { p_version_id: versionId ?? '' }),
        supabase
          .from('questionnaire_versions')
          .select('scoring_spec')
          .eq('id', versionId ?? '')
          .single(),
      ]);
      if (definition.error) throw definition.error;
      if (version.error) throw version.error;
      return {
        definition: QuestionnaireDefinitionSchema.parse(definition.data),
        spec: ScoringSpecSchema.parse(version.data.scoring_spec),
      };
    },
  });
}

/** Intentos de la familia (sin los descartados), del más nuevo al más viejo. */
export function useFamilyAttempts(familyId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.attempts(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select(
          'id, member_id, version_id, status, started_at, submitted_at, assessment_dimension_scores (dimension_code, band)',
        )
        .eq('family_id', familyId ?? '')
        .neq('status', 'discarded')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAttempt(attemptId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.attempt(attemptId ?? ''),
    enabled: attemptId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select(
          'id, family_id, member_id, version_id, status, member_age_months, submitted_at, family_members (alias)',
        )
        .eq('id', attemptId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAnswers(attemptId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.answers(attemptId ?? ''),
    enabled: attemptId !== undefined,
    queryFn: async (): Promise<AnswerRow[]> => {
      const { data, error } = await supabase
        .from('assessment_answers')
        .select('question_id, option_id, value_number')
        .eq('attempt_id', attemptId ?? '');
      if (error) throw error;
      return data;
    },
  });
}

export function useAttemptResult(attemptId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.result(attemptId ?? ''),
    enabled: attemptId !== undefined,
    queryFn: async () => {
      const [scores, recommendations] = await Promise.all([
        supabase
          .from('assessment_dimension_scores')
          .select('dimension_code, normalized, band, explanation')
          .eq('attempt_id', attemptId ?? ''),
        supabase
          .from('recommendations')
          .select(
            'id, rule_code, priority, reason, status, content_items (slug, type, title, evidence_label), activities (slug, title, evidence_label)',
          )
          .eq('attempt_id', attemptId ?? '')
          .order('priority')
          .order('created_at'),
      ]);
      if (scores.error) throw scores.error;
      if (recommendations.error) throw recommendations.error;
      return { scores: scores.data, recommendations: recommendations.data };
    },
  });
}

/** Intentos enviados de un integrante, del más viejo al más nuevo (para el historial). */
export function useMemberHistory(memberId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.history(memberId ?? ''),
    enabled: memberId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select(
          'id, version_id, submitted_at, member_age_months, family_members (alias), assessment_dimension_scores (dimension_code, band, normalized)',
        )
        .eq('member_id', memberId ?? '')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ── Mutaciones ──────────────────────────────────────────────────────────

export function useStartAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; versionId: string }) => {
      const { data, error } = await supabase.rpc('start_assessment', {
        p_member_id: input.memberId,
        p_version_id: input.versionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family'] }),
  });
}

/** Autoguardado: reemplaza la respuesta a una pregunta (optimista, con vuelta atrás). */
export function useSaveAnswer(attemptId: string) {
  const queryClient = useQueryClient();
  const key = assessmentKeys.answers(attemptId);
  return useMutation({
    mutationFn: async (input: {
      questionId: string;
      optionIds: string[];
      value: number | null;
    }) => {
      const { error } = await supabase.rpc('save_answer', {
        p_attempt_id: attemptId,
        p_question_id: input.questionId,
        p_option_ids: input.optionIds,
        // Sin número se manda null: la RPC guarda las opciones.
        p_value: input.value as number,
      });
      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AnswerRow[]>(key);
      const others = (previous ?? []).filter((row) => row.question_id !== input.questionId);
      const next: AnswerRow[] =
        input.value !== null
          ? [
              ...others,
              { question_id: input.questionId, option_id: null, value_number: input.value },
            ]
          : [
              ...others,
              ...input.optionIds.map((id) => ({
                question_id: input.questionId,
                option_id: id,
                value_number: null,
              })),
            ];
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useSubmitAssessment(attemptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(
        `/v1/assessments/${encodeURIComponent(attemptId)}/submit`,
        SubmitAssessmentResponseSchema,
        { method: 'POST' },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assessmentKeys.attempt(attemptId) });
      await queryClient.invalidateQueries({ queryKey: ['family'] });
      await queryClient.invalidateQueries({ queryKey: ['member'] });
    },
  });
}

export function useDiscardAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attemptId: string) => {
      const { error } = await supabase
        .from('assessment_attempts')
        .update({ status: 'discarded' })
        .eq('id', attemptId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family'] }),
  });
}

export function useUpdateRecommendation(attemptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: RecommendationStatus }) => {
      const { error } = await supabase
        .from('recommendations')
        .update({ status: input.status })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assessmentKeys.result(attemptId) }),
  });
}
