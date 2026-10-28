import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useMe } from '@/features/auth/queries';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Administración (F10). Las lecturas pasan por RLS y RPC que exigen permiso + aal2; las
// operaciones con la clave secreta (archivo de la credencial, verificar, roles), por la API.

export function usePermissions(): Set<string> {
  const me = useMe();
  return new Set(me.data?.permissions ?? []);
}

const OkSchema = z.object({ status: z.literal('ok') });

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview');
      if (error) throw error;
      return data as {
        pending_credentials: number | null;
        content_in_review: number | null;
        month_cost_usd: number | null;
        month_budget_usd: number | null;
        users: number | null;
      };
    },
  });
}

// ── Verificaciones ──────────────────────────────────────────────────────

export function useCredentialQueue() {
  return useQuery({
    queryKey: ['admin', 'credentials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_credentials')
        .select(
          'id, kind, profession, jurisdiction, license_number, issuer, document_path, status, updated_at, professional_profiles (user_id, display_name, verification_status, city, province), credential_verifications (method, result, evidence_note, checked_at)',
        )
        .in('status', ['submitted', 'verified', 'rejected'])
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export async function openCredentialDocument(credentialId: string): Promise<string> {
  const body = await apiFetch(
    `/v1/admin/credentials/${credentialId}/document-url`,
    z.object({ url: z.url(), expiresInSeconds: z.number() }),
    { method: 'POST', body: '{}' },
  );
  return body.url;
}

export function useVerifyCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      credentialId: string;
      result: 'verified' | 'rejected' | 'needs_info';
      method: 'refeps' | 'colegio' | 'manual';
      note: string;
    }) =>
      apiFetch(`/v1/admin/credentials/${input.credentialId}/verify`, OkSchema, {
        method: 'POST',
        body: JSON.stringify({
          result: input.result,
          method: input.method,
          ...(input.note.trim() ? { note: input.note.trim() } : {}),
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
}

// ── Usuarios y roles ────────────────────────────────────────────────────

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_users', { p_search: search });
      if (error) throw error;
      return data;
    },
  });
}

export function useSetRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: string; grant: boolean }) =>
      input.grant
        ? apiFetch(`/v1/admin/users/${input.userId}/roles`, OkSchema, {
            method: 'POST',
            body: JSON.stringify({ role: input.role }),
          })
        : apiFetch(`/v1/admin/users/${input.userId}/roles/${input.role}`, OkSchema, {
            method: 'DELETE',
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ── Contenidos, cuestionarios y base de conocimiento ────────────────────

export function useAdminContent() {
  return useQuery({
    queryKey: ['admin', 'content'],
    queryFn: async () => {
      const [content, activities, versions] = await Promise.all([
        supabase
          .from('content_items')
          .select('id, slug, type, title, status, updated_at')
          .order('title'),
        supabase.from('activities').select('id, slug, title, status, updated_at').order('title'),
        supabase
          .from('questionnaire_versions')
          .select('id, version, status, published_at, questionnaires (slug, title)')
          .order('version', { ascending: false }),
      ]);
      if (content.error) throw content.error;
      if (activities.error) throw activities.error;
      if (versions.error) throw versions.error;
      return { content: content.data, activities: activities.data, versions: versions.data };
    },
  });
}

export function useSetContentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: 'content' | 'activity'; id: string; status: string }) => {
      const { error } = await supabase.rpc('admin_set_content_status', {
        p_kind: input.kind,
        p_id: input.id,
        p_status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function usePublishQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase.rpc('admin_publish_questionnaire', { p_version: versionId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useKbDocuments() {
  return useQuery({
    queryKey: ['admin', 'kb'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_documents')
        .select('id, slug, type, title, status, embedding_model, indexed_at')
        .order('title');
      if (error) throw error;
      return data;
    },
  });
}

export function useSetKbStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'indexed' | 'retired' }) => {
      const { error } = await supabase.rpc('admin_set_kb_status', {
        p_document: input.id,
        p_status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] }),
  });
}

// ── Auditoría, uso y configuración ──────────────────────────────────────

/** `days`: eventos de los últimos N días (null = todos). La fecha se calcula al consultar. */
export function useAuditLog(filters: { action: string; days: number | null }) {
  return useQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('id, occurred_at, actor_id, action, entity_type, entity_id, family_id, metadata')
        .order('occurred_at', { ascending: false })
        .limit(100);
      if (filters.action) query = query.like('action', `${filters.action}%`);
      if (filters.days !== null) {
        const since = new Date(Date.now() - filters.days * 86_400_000).toISOString();
        query = query.gte('occurred_at', since);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUsageSummary() {
  return useQuery({
    queryKey: ['admin', 'usage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_usage_summary');
      if (error) throw error;
      return data;
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value, updated_at');
      if (error) throw error;
      return new Map(data.map((s) => [s.key, s.value]));
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; value: boolean | number }) => {
      const { error } = await supabase.rpc('admin_update_setting', {
        p_key: input.key,
        p_value: input.value,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useSpecialtiesAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code: string; label: string }) => {
      const { error } = await supabase
        .from('specialties')
        .insert({ code: input.code, label: input.label, position: 100 });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['specialties'] }),
  });
}
