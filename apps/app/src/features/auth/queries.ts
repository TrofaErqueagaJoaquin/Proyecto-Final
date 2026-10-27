import { CURRENT_POLICY_VERSION, MeResponseSchema, type MeResponse } from '@crecer/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

import { useAuth } from './AuthProvider';

export const authKeys = {
  me: ['me'] as const,
  terms: ['consents', 'terms_privacy'] as const,
};

/** Quién soy y a qué espacios accedo (GET /v1/me). */
export function useMe() {
  const auth = useAuth();
  return useQuery<MeResponse>({
    queryKey: authKeys.me,
    queryFn: () => apiFetch('/v1/me', MeResponseSchema),
    enabled: auth.status === 'signedIn',
  });
}

/** ¿La persona aceptó la versión vigente de términos y privacidad? (RLS: solo ve lo propio). */
export function useTermsConsent() {
  const auth = useAuth();
  return useQuery({
    queryKey: authKeys.terms,
    enabled: auth.status === 'signedIn',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consents')
        .select('policy_version')
        .eq('purpose', 'terms_privacy')
        .is('revoked_at', null)
        .maybeSingle();
      if (error) throw error;
      return { accepted: data?.policy_version === CURRENT_POLICY_VERSION, hasAny: data !== null };
    },
  });
}

/** Registra la aceptación. Si había una versión anterior, la revoca y registra la nueva. */
export function useAcceptTerms() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (auth.status !== 'signedIn') throw new Error('Sin sesión');
      const userId = auth.session.user.id;
      const revoke = await supabase
        .from('consents')
        .update({ revoked_at: new Date().toISOString(), revoked_by: userId })
        .eq('purpose', 'terms_privacy')
        .is('revoked_at', null)
        .neq('policy_version', CURRENT_POLICY_VERSION);
      if (revoke.error) throw revoke.error;
      const { error } = await supabase.from('consents').insert({
        purpose: 'terms_privacy',
        granted_by: userId,
        policy_version: CURRENT_POLICY_VERSION,
      });
      // 23505: ya estaba aceptada (doble toque): no es un error para la persona.
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.terms });
    },
  });
}
