import { CURRENT_POLICY_VERSION } from '@crecer/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

import type {
  CareStatus,
  CredentialStatus,
  GoalStatus,
  Modality,
  Scope,
  VerificationStatus,
} from './labels';

// Todo pasa por RLS y por las RPC del ciclo de vida (request_care, respond_care_request,
// end_care, revoke_access_grant). Las lecturas sensibles del profesional van por
// pro_member_overview(), que deja una entrada en la auditoría.

export const proKeys = {
  specialties: ['specialties'] as const,
  directory: ['professionals', 'directory'] as const,
  professional: (id: string) => ['professionals', id] as const,
  familyCare: (familyId: string) => ['care', 'family', familyId] as const,
  assignment: (id: string) => ['care', 'assignment', id] as const,
  myProfile: (userId: string) => ['professionals', 'me', userId] as const,
  credentials: (userId: string) => ['professionals', 'me', userId, 'credentials'] as const,
  cases: ['care', 'cases'] as const,
  overview: (assignmentId: string, memberId: string) =>
    ['care', 'overview', assignmentId, memberId] as const,
};

const PROFILE_FIELDS =
  'user_id, display_name, bio, modalities, city, province, public_contact, years_experience, verification_status, verified_at, is_listed, professional_specialties (specialty_code)';

export interface ProfessionalProfile {
  user_id: string;
  display_name: string;
  bio: string;
  modalities: Modality[];
  city: string | null;
  province: string | null;
  public_contact: string | null;
  years_experience: number | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  is_listed: boolean;
  specialties: string[];
}

function toProfile(row: {
  professional_specialties: { specialty_code: string }[];
  modalities: string[];
  verification_status: string;
  [key: string]: unknown;
}): ProfessionalProfile {
  const { professional_specialties, ...rest } = row;
  return {
    ...(rest as unknown as Omit<ProfessionalProfile, 'specialties'>),
    modalities: row.modalities as Modality[],
    verification_status: row.verification_status as VerificationStatus,
    specialties: professional_specialties.map((s) => s.specialty_code),
  };
}

export function useSpecialties() {
  return useQuery({
    queryKey: proKeys.specialties,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialties')
        .select('code, label')
        .order('position');
      if (error) throw error;
      return data;
    },
  });
}

/** Directorio: RLS devuelve solo los verificados y listados (y los que ya acompañan a mi familia). */
export function useDirectory() {
  return useQuery({
    queryKey: proKeys.directory,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(PROFILE_FIELDS)
        .eq('verification_status', 'verified')
        .eq('is_listed', true)
        .order('display_name');
      if (error) throw error;
      return data.map(toProfile);
    },
  });
}

export function useProfessional(id: string | undefined) {
  return useQuery({
    queryKey: proKeys.professional(id ?? ''),
    enabled: id !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(PROFILE_FIELDS)
        .eq('user_id', id ?? '')
        .maybeSingle();
      if (error) throw error;
      return data ? toProfile(data) : null;
    },
  });
}

/** Filtro del directorio (sin acentos ni mayúsculas en la ciudad). */
export function matchesDirectory(
  p: ProfessionalProfile,
  filters: { specialty: string | null; modality: Modality | null; place: string },
): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  if (filters.specialty && !p.specialties.includes(filters.specialty)) return false;
  if (filters.modality && !p.modalities.includes(filters.modality)) return false;
  const place = norm(filters.place);
  if (place && !norm(`${p.city ?? ''} ${p.province ?? ''}`).includes(place)) return false;
  return true;
}

// ── Familia ─────────────────────────────────────────────────────────────

const ASSIGNMENT_FIELDS =
  'id, status, request_message, created_at, responded_at, ended_at, end_reason, professional_id, professional_profiles (display_name, verification_status, public_contact), access_grants (id, member_id, scope, activated_at, revoked_at)';

export function useFamilyCare(familyId: string | undefined) {
  return useQuery({
    queryKey: proKeys.familyCare(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_assignments')
        .select(ASSIGNMENT_FIELDS)
        .eq('family_id', familyId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((a) => ({ ...a, status: a.status as CareStatus }));
    },
  });
}

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: proKeys.assignment(id ?? ''),
    enabled: id !== undefined,
    queryFn: async () => {
      const [assignment, observations, goals, activity] = await Promise.all([
        supabase
          .from('care_assignments')
          .select(`${ASSIGNMENT_FIELDS}, family_id`)
          .eq('id', id ?? '')
          .maybeSingle(),
        supabase
          .from('professional_observations')
          .select('id, member_id, body, created_at, updated_at')
          .eq('assignment_id', id ?? '')
          .eq('visibility', 'shared_family')
          .order('created_at', { ascending: false }),
        supabase
          .from('follow_up_goals')
          .select(
            'id, member_id, title, description, status, target_date, created_at, goal_progress_entries (id, note, progress, recorded_at)',
          )
          .eq('assignment_id', id ?? '')
          .order('created_at', { ascending: false }),
        // Actividad de acceso: cada lectura del resumen deja una fila (pro.read.member_overview).
        supabase
          .from('audit_log')
          .select('id, occurred_at, action, entity_id, metadata')
          .like('action', 'pro.%')
          .contains('metadata', { assignment_id: id ?? '' })
          .order('occurred_at', { ascending: false })
          .limit(20),
      ]);
      if (assignment.error) throw assignment.error;
      if (observations.error) throw observations.error;
      if (goals.error) throw goals.error;
      if (activity.error) throw activity.error;
      if (!assignment.data) return null;
      return {
        ...assignment.data,
        status: assignment.data.status as CareStatus,
        observations: observations.data,
        goals: goals.data.map((g) => ({ ...g, status: g.status as GoalStatus })),
        activity: activity.data,
      };
    },
  });
}

function useInvalidateCare() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['care'] });
}

export function useRequestCare(familyId: string | undefined) {
  const invalidate = useInvalidateCare();
  return useMutation({
    mutationFn: async (input: {
      professionalId: string;
      message: string;
      grants: { member_id: string | null; scopes: string[] }[];
    }) => {
      if (!familyId) throw new Error('Sin familia');
      const { data, error } = await supabase.rpc('request_care', {
        p_family_id: familyId,
        p_professional_id: input.professionalId,
        p_message: input.message,
        p_grants: input.grants,
        p_policy_version: CURRENT_POLICY_VERSION,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRevokeGrant() {
  const invalidate = useInvalidateCare();
  return useMutation({
    mutationFn: async (grantId: string) => {
      const { error } = await supabase.rpc('revoke_access_grant', { p_grant: grantId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useEndCare() {
  const invalidate = useInvalidateCare();
  return useMutation({
    mutationFn: async (input: { assignmentId: string; reason?: string }) => {
      const { error } = await supabase.rpc('end_care', {
        p_assignment: input.assignmentId,
        p_reason: input.reason ?? '',
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ── Profesional ─────────────────────────────────────────────────────────

function useUserId(): string | undefined {
  const auth = useAuth();
  return auth.status === 'signedIn' ? auth.session.user.id : undefined;
}

export function useMyProfessionalProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: proKeys.myProfile(userId ?? ''),
    enabled: userId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(PROFILE_FIELDS)
        .eq('user_id', userId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data ? toProfile(data) : null;
    },
  });
}

export interface ProfileInput {
  display_name: string;
  bio: string;
  modalities: Modality[];
  city: string | null;
  province: string | null;
  public_contact: string | null;
  years_experience: number | null;
  is_listed: boolean;
  specialties: string[];
}

export function useSaveProfessionalProfile() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ specialties, ...profile }: ProfileInput & { exists: boolean }) => {
      if (!userId) throw new Error('Sin sesión');
      const { exists, ...fields } = profile;
      const write = exists
        ? supabase.from('professional_profiles').update(fields).eq('user_id', userId)
        : supabase.from('professional_profiles').insert({ ...fields, user_id: userId });
      const { error } = await write;
      if (error) throw error;
      // Especialidades: se reemplazan (son pocas).
      const removed = await supabase
        .from('professional_specialties')
        .delete()
        .eq('professional_id', userId);
      if (removed.error) throw removed.error;
      if (specialties.length > 0) {
        const added = await supabase
          .from('professional_specialties')
          .insert(specialties.map((code) => ({ professional_id: userId, specialty_code: code })));
        if (added.error) throw added.error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals'] }),
  });
}

export function useMyCredentials() {
  const userId = useUserId();
  return useQuery({
    queryKey: proKeys.credentials(userId ?? ''),
    enabled: userId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_credentials')
        .select(
          'id, kind, profession, jurisdiction, license_number, issuer, document_path, status, created_at',
        )
        .order('created_at');
      if (error) throw error;
      return data.map((c) => ({ ...c, status: c.status as CredentialStatus }));
    },
  });
}

export interface CredentialInput {
  kind: 'license' | 'degree' | 'other';
  profession: string;
  jurisdiction: string | null;
  license_number: string | null;
  issuer: string | null;
  /** Archivo opcional (PDF o imagen) que se sube al bucket privado `credentials`. */
  file: { uri: string; name: string; type: string } | null;
}

export function useAddCredential() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...credential }: CredentialInput) => {
      if (!userId) throw new Error('Sin sesión');
      let documentPath: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80);
        documentPath = `${userId}/${String(Date.now())}-${safeName}`;
        const body = await (await fetch(file.uri)).blob();
        const upload = await supabase.storage
          .from('credentials')
          .upload(documentPath, body, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
      }
      const { error } = await supabase
        .from('professional_credentials')
        .insert({ ...credential, professional_id: userId, document_path: documentPath });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', 'me'] }),
  });
}

export function useSubmitCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentialId: string) => {
      const { error } = await supabase
        .from('professional_credentials')
        .update({ status: 'submitted' })
        .eq('id', credentialId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', 'me'] }),
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credential: { id: string; document_path: string | null }) => {
      const { error } = await supabase
        .from('professional_credentials')
        .delete()
        .eq('id', credential.id);
      if (error) throw error;
      if (credential.document_path) {
        await supabase.storage.from('credentials').remove([credential.document_path]);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', 'me'] }),
  });
}

export interface ProCase {
  id: string;
  family_id: string;
  status: CareStatus;
  family_name: string;
  requested_by_name: string | null;
  request_message: string | null;
  created_at: string;
  responded_at: string | null;
  ended_at: string | null;
  family_scopes: Scope[];
  members: { id: string; alias: string; age_months: number; scopes: Scope[] }[];
}

export function useProCases() {
  const userId = useUserId();
  return useQuery({
    queryKey: proKeys.cases,
    enabled: userId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pro_cases');
      if (error) throw error;
      return data as unknown as ProCase[];
    },
  });
}

export function useRespondCare() {
  const invalidate = useInvalidateCare();
  return useMutation({
    mutationFn: async (input: { assignmentId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_care_request', {
        p_assignment: input.assignmentId,
        p_accept: input.accept,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export interface MemberOverview {
  member: { id: string; alias: string; age_months: number; interests: string[] };
  scopes: Scope[];
  assessments?: {
    id: string;
    submitted_at: string;
    member_age_months: number;
    dimensions:
      { code: string; band: 'strength' | 'watch' | 'priority'; normalized: number }[] | null;
  }[];
  goals?: {
    id: string;
    title: string;
    description: string | null;
    status: GoalStatus;
    source: string;
    target_date: string | null;
    created_at: string;
    progress: { note: string; progress: number | null; recorded_at: string }[] | null;
  }[];
  activities?: { title: string; done_on: string; rating: number | null }[];
  observations?: {
    id: string;
    body: string;
    visibility: 'private' | 'shared_family';
    mine: boolean;
    author_name: string;
    created_at: string;
    updated_at: string;
  }[];
}

/** Cada llamada queda registrada en la auditoría de la familia: no se refresca sola. */
export function useMemberOverview(assignmentId: string | undefined, memberId: string | undefined) {
  return useQuery({
    queryKey: proKeys.overview(assignmentId ?? '', memberId ?? ''),
    enabled: assignmentId !== undefined && memberId !== undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pro_member_overview', {
        p_assignment: assignmentId ?? '',
        p_member: memberId ?? '',
      });
      if (error) throw error;
      return data as unknown as MemberOverview;
    },
  });
}

function useRefreshOverview(assignmentId: string, memberId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: proKeys.overview(assignmentId, memberId) });
}

export function useSaveObservation(assignmentId: string, memberId: string) {
  const userId = useUserId();
  const refresh = useRefreshOverview(assignmentId, memberId);
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      body: string;
      visibility: 'private' | 'shared_family';
    }) => {
      if (!userId) throw new Error('Sin sesión');
      const { error } = input.id
        ? await supabase
            .from('professional_observations')
            .update({ body: input.body, visibility: input.visibility })
            .eq('id', input.id)
        : await supabase.from('professional_observations').insert({
            assignment_id: assignmentId,
            member_id: memberId,
            author_id: userId,
            body: input.body,
            visibility: input.visibility,
          });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useProposeGoal(assignmentId: string, memberId: string, familyId: string) {
  const userId = useUserId();
  const refresh = useRefreshOverview(assignmentId, memberId);
  return useMutation({
    mutationFn: async (input: { title: string; description: string | null }) => {
      if (!userId) throw new Error('Sin sesión');
      const { error } = await supabase.from('follow_up_goals').insert({
        family_id: familyId,
        member_id: memberId,
        assignment_id: assignmentId,
        title: input.title,
        description: input.description,
        source: 'professional',
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useAddGoalProgress(onDone: () => unknown) {
  const userId = useUserId();
  return useMutation({
    mutationFn: async (input: { goalId: string; note: string; progress: number | null }) => {
      if (!userId) throw new Error('Sin sesión');
      const { error } = await supabase.from('goal_progress_entries').insert({
        goal_id: input.goalId,
        author_id: userId,
        note: input.note,
        progress: input.progress,
      });
      if (error) throw error;
    },
    onSuccess: onDone,
  });
}

export function useUpdateGoalStatus(onDone: () => unknown) {
  return useMutation({
    mutationFn: async (input: { goalId: string; status: GoalStatus }) => {
      const { error } = await supabase
        .from('follow_up_goals')
        .update({ status: input.status })
        .eq('id', input.goalId);
      if (error) throw error;
    },
    onSuccess: onDone,
  });
}

export { useRefreshOverview };
