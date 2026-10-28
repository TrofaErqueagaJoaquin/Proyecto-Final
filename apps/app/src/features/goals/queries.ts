import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import type { GoalStatus } from '@/features/professionals/labels';
import { supabase } from '@/lib/supabase';

// Objetivos de seguimiento desde la familia (RLS: la caregiver los ve; owner y guardian los
// crean y anotan avances). Los que propone un profesional llegan con source = 'professional'.

export const goalKeys = { list: (familyId: string) => ['goals', familyId] as const };

export interface GoalRow {
  id: string;
  member_id: string | null;
  title: string;
  description: string | null;
  source: 'family' | 'professional' | 'recommendation';
  status: GoalStatus;
  target_date: string | null;
  created_at: string;
  progress: { id: string; note: string; progress: number | null; recorded_at: string }[];
}

export function useGoals(familyId: string | undefined) {
  return useQuery({
    queryKey: goalKeys.list(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async (): Promise<GoalRow[]> => {
      const { data, error } = await supabase
        .from('follow_up_goals')
        .select(
          'id, member_id, title, description, source, status, target_date, created_at, goal_progress_entries (id, note, progress, recorded_at)',
        )
        .eq('family_id', familyId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(({ goal_progress_entries, ...goal }) => ({
        ...goal,
        source: goal.source as GoalRow['source'],
        status: goal.status as GoalStatus,
        progress: [...goal_progress_entries].sort((a, b) =>
          b.recorded_at.localeCompare(a.recorded_at),
        ),
      }));
    },
  });
}

/** Último porcentaje anotado (o null). */
export function latestProgress(goal: GoalRow): number | null {
  return goal.progress.find((p) => p.progress !== null)?.progress ?? null;
}

export function useCreateGoal(familyId: string | undefined) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string | null;
      memberId: string | null;
      source: 'family' | 'recommendation';
      targetDate: string | null;
    }) => {
      if (!familyId || auth.status !== 'signedIn') throw new Error('Sin familia');
      const { error } = await supabase.from('follow_up_goals').insert({
        family_id: familyId,
        member_id: input.memberId,
        title: input.title,
        description: input.description,
        source: input.source,
        target_date: input.targetDate,
        created_by: auth.session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useAddProgress() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goalId: string; note: string; progress: number | null }) => {
      if (auth.status !== 'signedIn') throw new Error('Sin sesión');
      const { error } = await supabase.from('goal_progress_entries').insert({
        goal_id: input.goalId,
        author_id: auth.session.user.id,
        note: input.note,
        progress: input.progress,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useSetGoalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goalId: string; status: GoalStatus }) => {
      const { error } = await supabase
        .from('follow_up_goals')
        .update({ status: input.status })
        .eq('id', input.goalId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}
