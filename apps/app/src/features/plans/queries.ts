import {
  ageInMonths,
  alternativeFor,
  type PlanActivity,
  type PlanInput,
  type PlanReason,
} from '@crecer/domain';
import { GeneratePlanResponseSchema } from '@crecer/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// El plan lo arma la API (generador por reglas de packages/domain). "Otra idea" usa el mismo
// generador acá, con el catálogo público, y guarda el cambio con RLS.

export const planKeys = {
  week: (familyId: string, weekStart: string) => ['plans', familyId, weekStart] as const,
};

export const REASON_LABELS: Record<PlanReason | 'manual', string> = {
  recommended: 'Recomendada por la evaluación',
  interest: 'Por lo que les gusta',
  variety: 'Para variar',
  quick: 'Con poco tiempo: 10 minutos, sin materiales',
  manual: 'Elegida por ustedes',
};

/** Fecha local (YYYY-MM-DD), no UTC: "hoy" es el día de la familia. */
export function localDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${String(y)}-${m}-${d}`;
}

export interface PlanItemRow {
  id: string;
  scheduled_for: string;
  status: 'planned' | 'done' | 'skipped';
  reason: PlanReason | 'manual';
  activity: { id: string; slug: string; title: string; duration_min: number; categories: string[] };
}

export interface WeekPlan {
  id: string;
  member_id: string | null;
  week_start: string;
  items: PlanItemRow[];
}

export function useWeekPlans(familyId: string | undefined, weekStart: string) {
  return useQuery({
    queryKey: planKeys.week(familyId ?? '', weekStart),
    enabled: familyId !== undefined,
    queryFn: async (): Promise<WeekPlan[]> => {
      const { data, error } = await supabase
        .from('family_plans')
        .select(
          'id, member_id, week_start, plan_items (id, scheduled_for, status, reason, activities (id, slug, title, duration_min, activity_category_links (category_code)))',
        )
        .eq('family_id', familyId ?? '')
        .eq('week_start', weekStart);
      if (error) throw error;
      return data.map((plan) => ({
        id: plan.id,
        member_id: plan.member_id,
        week_start: plan.week_start,
        items: plan.plan_items
          .map((item) => ({
            id: item.id,
            scheduled_for: item.scheduled_for,
            status: item.status as PlanItemRow['status'],
            reason: item.reason as PlanItemRow['reason'],
            activity: {
              id: item.activities.id,
              slug: item.activities.slug,
              title: item.activities.title,
              duration_min: item.activities.duration_min,
              categories: item.activities.activity_category_links.map((l) => l.category_code),
            },
          }))
          .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for)),
      }));
    },
  });
}

function useInvalidatePlans() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plans'] }),
      queryClient.invalidateQueries({ queryKey: ['family'] }),
    ]);
}

export function useGeneratePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (input: { familyId: string; memberId: string | null; weekStart: string }) =>
      apiFetch('/v1/plans/generate', GeneratePlanResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useCompleteItem() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: { itemId: string; memberIds: string[]; rating: number | null }) => {
      const { error } = await supabase.rpc('complete_plan_item', {
        p_item: input.itemId,
        p_member_ids: input.memberIds,
        // null = sin valoración: la función lo acepta aunque el tipo generado pida un número.
        p_rating: input.rating as number,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSkipItem() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('plan_items')
        .update({ status: 'skipped' })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Catálogo público → forma que usa el generador. */
export function toPlanActivities(
  activities: {
    id: string;
    title: string;
    age_min_months: number;
    age_max_months: number;
    duration_min: number;
    cost_level: string;
    space: string;
    materials: string[];
    categories: string[];
  }[],
): PlanActivity[] {
  return activities.map((a) => ({
    id: a.id,
    title: a.title,
    ageMinMonths: a.age_min_months,
    ageMaxMonths: a.age_max_months,
    durationMin: a.duration_min,
    costLevel: a.cost_level as PlanActivity['costLevel'],
    space: a.space as PlanActivity['space'],
    materialsCount: a.materials.length,
    categories: a.categories,
  }));
}

/** "Otra idea": la mejor alternativa con las mismas reglas, o null si no hay otra. */
export function useReplaceItem() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      plan: WeekPlan;
      activities: PlanActivity[];
      preferences: PlanInput['preferences'];
      birthMonths: string[];
    }) => {
      const replacing = input.plan.items.find((i) => i.id === input.itemId);
      if (!replacing) throw new Error('Ítem inexistente');
      const next = alternativeFor(
        {
          weekStart: input.plan.week_start,
          agesMonths: input.birthMonths.map((b) => ageInMonths(b, new Date())),
          preferences: input.preferences,
          activities: input.activities,
          recommendedActivityIds: [],
          recentlyDoneIds: [],
        },
        input.plan.items.map((i) => ({ activityId: i.activity.id })),
        replacing.activity.id,
      );
      if (!next) return false;
      const { error } = await supabase
        .from('plan_items')
        .update({ activity_id: next, reason: 'manual', status: 'planned' })
        .eq('id', input.itemId);
      if (error) throw error;
      return true;
    },
    onSuccess: invalidate,
  });
}
