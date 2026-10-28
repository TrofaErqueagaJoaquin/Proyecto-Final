import {
  CURRENT_POLICY_VERSION,
  ErrorResponseSchema,
  type AssistantCitation,
  type AssistantEvent,
  type AssistantMessage,
} from '@crecer/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetch as expoFetch } from 'expo/fetch';

import { useAuth } from '@/features/auth/AuthProvider';
import { ApiError } from '@/lib/api';
import { publicEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import { createSseParser } from './sse';

// Las conversaciones se crean y se borran con RLS (solo su autor, owner o guardian).
// Los mensajes los escribe la API: acá solo se leen y se manda la pregunta por SSE.

export const assistantKeys = {
  list: (familyId: string) => ['assistant', familyId] as const,
  conversation: (id: string) => ['assistant', 'conversation', id] as const,
  consent: (familyId: string) => ['assistant', 'consent', familyId] as const,
};

export function useConversations(familyId: string | undefined) {
  return useQuery({
    queryKey: assistantKeys.list(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, member_id, updated_at, expires_at')
        .eq('family_id', familyId ?? '')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  body: string;
  citations: AssistantCitation[];
  outcome: AssistantMessage['outcome'] | null;
  riskLevel: 'none' | 'clinical' | 'high' | null;
  rehearsal: boolean;
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: assistantKeys.conversation(id ?? ''),
    enabled: id !== undefined,
    queryFn: async () => {
      const [conversation, messages] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, family_id, member_id, title, use_personal_context, expires_at')
          .eq('id', id ?? '')
          .maybeSingle(),
        supabase
          .from('assistant_messages')
          .select('id, role, body, citations, outcome, risk_level, model')
          .eq('conversation_id', id ?? '')
          .order('created_at'),
      ]);
      if (conversation.error) throw conversation.error;
      if (messages.error) throw messages.error;
      if (!conversation.data) return null;
      return {
        ...conversation.data,
        messages: messages.data.map((m): StoredMessage => ({
          id: m.id,
          role: m.role as StoredMessage['role'],
          body: m.body,
          citations: m.citations as unknown as AssistantCitation[],
          outcome: m.outcome as StoredMessage['outcome'],
          riskLevel: m.risk_level as StoredMessage['riskLevel'],
          rehearsal: m.model === 'fake',
        })),
      };
    },
  });
}

export function useCreateConversation(familyId: string | undefined) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string | null; usePersonalContext: boolean }) => {
      if (!familyId || auth.status !== 'signedIn') throw new Error('Sin familia');
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          family_id: familyId,
          user_id: auth.session.user.id,
          member_id: input.memberId,
          use_personal_context: input.usePersonalContext,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assistant'] }),
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assistant'] }),
  });
}

export function useSetPersonalContext(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase
        .from('conversations')
        .update({ use_personal_context: value })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversation(conversationId) }),
  });
}

/** Consentimiento de la familia para usar su contexto con la IA (AI_ARCHITECTURE.md §5). */
export function useAiContextConsent(familyId: string | undefined) {
  return useQuery({
    queryKey: assistantKeys.consent(familyId ?? ''),
    enabled: familyId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consents')
        .select('id')
        .eq('family_id', familyId ?? '')
        .eq('purpose', 'ai_personal_context')
        .is('revoked_at', null)
        .limit(1);
      if (error) throw error;
      return data.length > 0;
    },
  });
}

export function useGrantAiContext(familyId: string | undefined) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!familyId || auth.status !== 'signedIn') throw new Error('Sin familia');
      const { error } = await supabase.from('consents').insert({
        purpose: 'ai_personal_context',
        family_id: familyId,
        granted_by: auth.session.user.id,
        policy_version: CURRENT_POLICY_VERSION,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/**
 * Manda la pregunta y lee la respuesta por SSE. expo/fetch permite leer el cuerpo por partes
 * en web y en el teléfono. Devuelve el mensaje final (o lanza ApiError).
 */
export async function sendQuestion(
  conversationId: string,
  question: string,
  onEvent: (event: AssistantEvent) => void,
  signal?: AbortSignal,
): Promise<AssistantMessage> {
  const { data } = await supabase.auth.getSession();
  let response: Awaited<ReturnType<typeof expoFetch>>;
  try {
    response = await expoFetch(
      `${publicEnv.EXPO_PUBLIC_API_URL}/v1/assistant/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        },
        body: JSON.stringify({ question }),
        ...(signal ? { signal } : {}),
      },
    );
  } catch {
    throw new ApiError(0, 'SERVICE_UNAVAILABLE', 'No pudimos conectarnos. Revisá tu conexión.');
  }

  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) {
      const { code, message, requestId } = parsed.data.error;
      throw new ApiError(response.status, code, message, requestId);
    }
    throw new ApiError(response.status, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  }

  const parse = createSseParser();
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(0, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  const decoder = new TextDecoder();
  let final: AssistantMessage | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (value) {
      for (const event of parse(decoder.decode(value, { stream: true }))) {
        onEvent(event);
        if (event.type === 'done') final = event.message;
        if (event.type === 'error') throw new ApiError(500, 'INTERNAL_ERROR', event.message);
      }
    }
    if (done) break;
  }
  if (!final)
    throw new ApiError(0, 'SERVICE_UNAVAILABLE', 'La respuesta se cortó. Probá de nuevo.');
  return final;
}
