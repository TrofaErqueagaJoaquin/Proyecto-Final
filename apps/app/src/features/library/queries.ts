import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

// El catálogo es público (RLS: solo lo publicado), así que funciona con o sin sesión.

export const libraryKeys = {
  list: (type: string) => ['library', type] as const,
  item: (slug: string) => ['library', 'item', slug] as const,
  sources: ['library', 'sources'] as const,
  activities: ['activities'] as const,
  activity: (slug: string) => ['activities', slug] as const,
  categories: ['activities', 'categories'] as const,
  saved: (familyId: string) => ['family', familyId, 'saved'] as const,
  logs: (familyId: string) => ['family', familyId, 'logs'] as const,
};

export function useContentList(type: 'age_stage' | 'situation_card' | 'guide') {
  return useQuery({
    queryKey: libraryKeys.list(type),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select('slug, title, summary, evidence_label, age_min_months, age_max_months')
        .eq('type', type)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useContentItem(slug: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.item(slug ?? ''),
    enabled: slug !== undefined,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select(
          'slug, type, title, summary, body_md, evidence_label, reviewed_at, updated_at, content_sources (locator, sources (slug, citation, url, doi, verification_status))',
        )
        .eq('slug', slug ?? '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSources() {
  return useQuery({
    queryKey: libraryKeys.sources,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sources')
        .select('slug, citation, study_type, year, url, doi, confidence, verification_status')
        .order('year', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useActivities() {
  return useQuery({
    queryKey: libraryKeys.activities,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(
          'id, slug, title, summary, objective, age_min_months, age_max_months, duration_min, cost_level, space, materials, evidence_label, activity_category_links (category_code)',
        )
        .order('title');
      if (error) throw error;
      return data
        .map(({ activity_category_links, ...activity }) => ({
          ...activity,
          categories: activity_category_links.map((link) => link.category_code),
        }))
        .sort((a, b) =>
          // Orden alfabético en español, sin que "¿" o "(" manden al principio.
          a.title.localeCompare(b.title, 'es', { ignorePunctuation: true, sensitivity: 'base' }),
        );
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: libraryKeys.categories,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_categories')
        .select('code, label')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useActivity(slug: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.activity(slug ?? ''),
    enabled: slug !== undefined,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(
          '*, activity_steps (position, body), activity_category_links (activity_categories (code, label)), activity_sources (locator, sources (slug, citation, url, doi, verification_status))',
        )
        .eq('slug', slug ?? '')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        activity_steps: [...data.activity_steps].sort((a, b) => a.position - b.position),
      };
    },
  });
}

// ── Datos de la familia sobre actividades ───────────────────────────────

export function useSavedActivities(familyId: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.saved(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_activities')
        .select('activity_id, created_at, activities (slug, title, summary, duration_min)')
        .eq('family_id', familyId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useActivityLogs(familyId: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.logs(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(
          'id, done_on, rating, activities (slug, title), activity_log_participants (family_members (alias))',
        )
        .eq('family_id', familyId ?? '')
        .order('done_on', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleSaved(familyId: string | undefined) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { activityId: string; saved: boolean }) => {
      if (!familyId || auth.status !== 'signedIn') throw new Error('Sin familia');
      if (input.saved) {
        const { error } = await supabase
          .from('saved_activities')
          .delete()
          .eq('family_id', familyId)
          .eq('activity_id', input.activityId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_activities').insert({
          family_id: familyId,
          activity_id: input.activityId,
          saved_by: auth.session.user.id,
        });
        if (error && error.code !== '23505') throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.saved(familyId ?? '') }),
  });
}

export function useLogActivity(familyId: string | undefined) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      activityId: string;
      memberIds: string[];
      rating: number | null;
    }) => {
      if (!familyId || auth.status !== 'signedIn') throw new Error('Sin familia');
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          family_id: familyId,
          activity_id: input.activityId,
          logged_by: auth.session.user.id,
          rating: input.rating,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (input.memberIds.length > 0) {
        const participants = await supabase
          .from('activity_log_participants')
          .insert(input.memberIds.map((memberId) => ({ log_id: data.id, member_id: memberId })));
        if (participants.error) throw participants.error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.logs(familyId ?? '') }),
  });
}
