import {
  CreateInvitationResponseSchema,
  CURRENT_POLICY_VERSION,
  type CreateInvitationInput,
  type FamilyRole,
  type PreferencesInput,
} from '@crecer/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authKeys, useMe } from '@/features/auth/queries';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Lecturas y escrituras directas a Supabase: RLS decide qué puede ver o cambiar cada adulto.
// Las altas atómicas van por RPC (create_family, add_family_member, accept_family_invitation)
// y las invitaciones por la API (generan el token y envían el correo).

export const familyKeys = {
  family: (id: string) => ['family', id] as const,
  members: (id: string) => ['family', id, 'members'] as const,
  adults: (id: string) => ['family', id, 'adults'] as const,
  invitations: (id: string) => ['family', id, 'invitations'] as const,
  preferences: (id: string) => ['family', id, 'preferences'] as const,
  consents: (id: string) => ['family', id, 'consents'] as const,
};

/** Familia activa: la primera de /v1/me (el selector entre varias llega más adelante). */
export function useActiveFamily(): {
  isPending: boolean;
  family: { id: string; name: string; role: FamilyRole } | null;
} {
  const me = useMe();
  return { isPending: me.isPending, family: me.data?.families[0] ?? null };
}

export function canManage(role: FamilyRole | undefined): boolean {
  return role === 'owner' || role === 'guardian';
}

export function useMembers(familyId: string | undefined) {
  return useQuery({
    queryKey: familyKeys.members(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_members')
        .select('id, alias, birth_month, interests, archived_at')
        .eq('family_id', familyId ?? '')
        .order('birth_month', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdults(familyId: string | undefined) {
  return useQuery({
    queryKey: familyKeys.adults(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_memberships')
        .select(
          'user_id, role, relationship, created_at, profiles!family_memberships_user_id_fkey (display_name)',
        )
        .eq('family_id', familyId ?? '')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingInvitations(familyId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: familyKeys.invitations(familyId ?? ''),
    enabled: familyId !== undefined && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_invitations')
        .select('id, email, role, expires_at')
        .eq('family_id', familyId ?? '')
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePreferences(familyId: string | undefined) {
  return useQuery({
    queryKey: familyKeys.preferences(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_preferences')
        .select('minutes_per_day, space, budget, interests')
        .eq('family_id', familyId ?? '')
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useFamilyConsents(familyId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: familyKeys.consents(familyId ?? ''),
    enabled: familyId !== undefined && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consents')
        .select('id, purpose, member_id, policy_version, granted_at, family_members (alias)')
        .eq('family_id', familyId ?? '')
        .is('revoked_at', null)
        .order('granted_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ── Mutaciones ──────────────────────────────────────────────────────────

function useInvalidateFamily(familyId: string | undefined) {
  const queryClient = useQueryClient();
  return async () => {
    if (familyId) await queryClient.invalidateQueries({ queryKey: ['family', familyId] });
    await queryClient.invalidateQueries({ queryKey: authKeys.me });
  };
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; relationship: string }) => {
      const { data, error } = await supabase.rpc('create_family', {
        p_name: input.name,
        p_relationship: input.relationship,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

export function useAddMember(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (input: { alias: string; birthMonth: string; interests: string[] }) => {
      const { data, error } = await supabase.rpc('add_family_member', {
        p_family_id: familyId ?? '',
        p_alias: input.alias,
        p_birth_month: input.birthMonth,
        p_interests: input.interests,
        p_policy_version: CURRENT_POLICY_VERSION,
        // La pantalla solo llama a esta mutación con la casilla de consentimiento marcada.
        p_child_data_consent: true,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateMember(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (input: {
      id: string;
      changes: {
        alias?: string;
        birth_month?: string;
        interests?: string[];
        archived_at?: string | null;
      };
    }) => {
      const { error } = await supabase
        .from('family_members')
        .update(input.changes)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMember(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('family_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCreateInvitation(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      apiFetch(`/v1/families/${familyId ?? ''}/invitations`, CreateInvitationResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useRevokeInvitation(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('family_invitations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useChangeAdultRole(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (input: { userId: string; role: FamilyRole }) => {
      const { error } = await supabase
        .from('family_memberships')
        .update({ role: input.role })
        .eq('family_id', familyId ?? '')
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRemoveAdult(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('family_memberships')
        .delete()
        .eq('family_id', familyId ?? '')
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePreferences(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (input: PreferencesInput) => {
      const { error } = await supabase
        .from('family_preferences')
        .update({
          minutes_per_day: input.minutesPerDay,
          space: input.space,
          budget: input.budget,
          interests: input.interests,
        })
        .eq('family_id', familyId ?? '');
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRevokeConsent(familyId: string | undefined) {
  const invalidate = useInvalidateFamily(familyId);
  return useMutation({
    mutationFn: async (input: { consentId: string; userId: string }) => {
      const { error } = await supabase
        .from('consents')
        .update({ revoked_at: new Date().toISOString(), revoked_by: input.userId })
        .eq('id', input.consentId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { token: string; relationship: string }) => {
      const { data, error } = await supabase.rpc('accept_family_invitation', {
        p_token: input.token,
        p_relationship: input.relationship,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}
