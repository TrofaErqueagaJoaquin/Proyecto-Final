import { ageInMonths, formatAge } from '@crecer/domain';

import type { Env } from '../../env';
import { toHttpError } from '../../lib/db-errors';
import { createServiceClient, createUserClient } from '../../lib/supabase';
import type { AuthContext } from '../../types';

export interface ConversationRow {
  id: string;
  familyId: string;
  memberId: string | null;
  title: string;
  usePersonalContext: boolean;
}

export interface Quota {
  enabled: boolean;
  monthlyBudgetUsd: number;
  monthCostUsd: number;
  dailyLimit: number;
  minuteLimit: number;
  todayMessages: number;
  minuteMessages: number;
}

export interface SearchHit {
  slug: string;
  type: string;
  title: string;
  urlPath: string | null;
  evidenceLabel: string;
  headingPath: string;
  body: string;
  ftsRank: number | null;
  /** Proporción de los términos de la pregunta que aparecen en el fragmento (0 a 1). */
  ftsCoverage: number | null;
  similarity: number | null;
}

export interface SaveMessageInput {
  conversationId: string;
  role: 'user' | 'assistant';
  body: string;
  citations?: unknown[];
  riskLevel?: 'none' | 'clinical' | 'high' | null;
  outcome?: string | null;
  promptVersion?: string | null;
  model?: string | null;
}

/**
 * Lecturas con el JWT de la persona (RLS: solo lo suyo y lo que puede ver de su familia) y
 * escrituras con service_role (los mensajes y el uso los escribe solo la API).
 */
export interface AssistantPort {
  loadConversation(auth: AuthContext, id: string): Promise<ConversationRow | null>;
  loadHistory(
    auth: AuthContext,
    id: string,
  ): Promise<{ role: 'user' | 'assistant'; body: string }[]>;
  memberAgeMonths(auth: AuthContext, memberId: string): Promise<number | null>;
  /** Bloque de contexto (≤ ~400 tokens, sin nombres) o null sin consentimiento ai_personal_context. */
  familyContext(auth: AuthContext, conversation: ConversationRow): Promise<string | null>;
  quota(userId: string): Promise<Quota>;
  saveMessage(input: SaveMessageInput): Promise<string>;
  addUsage(input: {
    userId: string;
    familyId: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costUsd: number;
  }): Promise<void>;
  /** Renueva el vencimiento y, la primera vez, pone la pregunta como título. */
  touchConversation(id: string, title: string): Promise<void>;
  search(query: string, embedding: number[] | null, ageMonths: number | null): Promise<SearchHit[]>;
}

const BAND_TEXT: Record<string, string> = {
  strength: 'fortaleza',
  watch: 'para mirar',
  priority: 'por dónde empezar',
};
const DIMENSION_TEXT: Record<string, string> = {
  sueno: 'Sueño',
  movimiento: 'Movimiento',
  pantalla_tiempo: 'Tiempo de pantalla',
  pantalla_contexto: 'Cómo se usan las pantallas',
  calma: 'Calma',
  acuerdos: 'Acuerdos',
};
const SPACE_TEXT: Record<string, string> = {
  small_indoor: 'espacio chico',
  indoor: 'adentro, con lugar',
  outdoor: 'patio o plaza',
};
const BUDGET_TEXT: Record<string, string> = { free: 'sin gastar', low: 'poco', medium: 'algo más' };

export function createSupabaseAssistant(env: Env): AssistantPort {
  const service = () => createServiceClient(env);

  return {
    async loadConversation(auth, id) {
      const result = await createUserClient(env, auth.token)
        .from('conversations')
        .select('id, family_id, member_id, title, use_personal_context')
        .eq('id', id)
        .maybeSingle();
      if (result.error) throw toHttpError(result.error);
      if (!result.data) return null;
      return {
        id: result.data.id,
        familyId: result.data.family_id,
        memberId: result.data.member_id,
        title: result.data.title,
        usePersonalContext: result.data.use_personal_context,
      };
    },

    async loadHistory(auth, id) {
      const result = await createUserClient(env, auth.token)
        .from('assistant_messages')
        .select('role, body')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .limit(12);
      if (result.error) throw toHttpError(result.error);
      return result.data
        .reverse()
        .map((m) => ({ role: m.role as 'user' | 'assistant', body: m.body }));
    },

    async memberAgeMonths(auth, memberId) {
      const result = await createUserClient(env, auth.token)
        .from('family_members')
        .select('birth_month')
        .eq('id', memberId)
        .maybeSingle();
      if (result.error) throw toHttpError(result.error);
      return result.data ? ageInMonths(result.data.birth_month, new Date()) : null;
    },

    async familyContext(auth, conversation) {
      const db = createUserClient(env, auth.token);
      const consent = await db
        .from('consents')
        .select('id')
        .eq('family_id', conversation.familyId)
        .eq('purpose', 'ai_personal_context')
        .is('revoked_at', null)
        .limit(1);
      if (consent.error) throw toHttpError(consent.error);
      if (consent.data.length === 0) return null;

      const lines: string[] = [];
      const memberId = conversation.memberId;
      const [preferences, goals] = await Promise.all([
        db
          .from('family_preferences')
          .select('minutes_per_day, space, budget')
          .eq('family_id', conversation.familyId)
          .maybeSingle(),
        db
          .from('follow_up_goals')
          .select('title, member_id')
          .eq('family_id', conversation.familyId)
          .eq('status', 'active')
          .limit(5),
      ]);

      if (memberId) {
        const [member, attempt, recs, logs] = await Promise.all([
          db.from('family_members').select('birth_month').eq('id', memberId).maybeSingle(),
          db
            .from('assessment_attempts')
            .select('submitted_at, assessment_dimension_scores (dimension_code, band)')
            .eq('member_id', memberId)
            .eq('status', 'submitted')
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          db
            .from('recommendations')
            .select('content_items (title), activities (title)')
            .eq('member_id', memberId)
            .in('status', ['new', 'accepted'])
            .limit(5),
          db
            .from('activity_log_participants')
            .select('activity_logs (done_on, activities (title))')
            .eq('member_id', memberId)
            .limit(5),
        ]);
        // Sin apodo (seudonimización, §5): solo la edad.
        if (member.data) {
          lines.push(
            `Integrante de ${formatAge(ageInMonths(member.data.birth_month, new Date()))}.`,
          );
        }
        if (attempt.data?.submitted_at) {
          const bands = attempt.data.assessment_dimension_scores
            .map(
              (d) =>
                `${DIMENSION_TEXT[d.dimension_code] ?? d.dimension_code}: ${BAND_TEXT[d.band] ?? d.band}`,
            )
            .join(' · ');
          lines.push(`Última evaluación (${attempt.data.submitted_at.slice(0, 10)}): ${bands}.`);
        }
        const recTitles = (recs.data ?? [])
          .map((r) => r.content_items?.title ?? r.activities?.title)
          .filter(Boolean);
        if (recTitles.length > 0) lines.push(`Recomendaciones activas: ${recTitles.join('; ')}.`);
        const done = (logs.data ?? []).map(
          (l) => `${l.activity_logs.activities.title} (${l.activity_logs.done_on})`,
        );
        if (done.length > 0) lines.push(`Actividades hechas: ${done.join('; ')}.`);
      }

      const goalTitles = (goals.data ?? [])
        .filter((g) => g.member_id === null || g.member_id === memberId)
        .map((g) => g.title);
      if (goalTitles.length > 0) lines.push(`Objetivos en curso: ${goalTitles.join('; ')}.`);
      const p = preferences.data;
      if (p && (p.minutes_per_day !== null || p.space || p.budget)) {
        lines.push(
          `Preferencias: ${[
            p.minutes_per_day === null ? null : `${String(p.minutes_per_day)} minutos por día`,
            p.space ? (SPACE_TEXT[p.space] ?? p.space) : null,
            p.budget ? `presupuesto: ${BUDGET_TEXT[p.budget] ?? p.budget}` : null,
          ]
            .filter(Boolean)
            .join(', ')}.`,
        );
      }
      // Tope de ~400 tokens.
      const text = lines.join('\n').slice(0, 1600);
      return text.length > 0 ? text : null;
    },

    async quota(userId) {
      const result = await service().rpc('assistant_quota', { p_user: userId });
      if (result.error) throw toHttpError(result.error);
      const q = result.data as Record<string, unknown>;
      return {
        enabled: q.enabled === true,
        monthlyBudgetUsd: Number(q.monthly_budget_usd),
        monthCostUsd: Number(q.month_cost_usd),
        dailyLimit: Number(q.daily_limit),
        minuteLimit: Number(q.minute_limit),
        todayMessages: Number(q.today_messages),
        minuteMessages: Number(q.minute_messages),
      };
    },

    async saveMessage(input) {
      const result = await service()
        .from('assistant_messages')
        .insert({
          conversation_id: input.conversationId,
          role: input.role,
          body: input.body,
          citations: JSON.parse(JSON.stringify(input.citations ?? [])) as never,
          risk_level: input.riskLevel ?? null,
          outcome: input.outcome ?? null,
          prompt_version: input.promptVersion ?? null,
          model: input.model ?? null,
        })
        .select('id')
        .single();
      if (result.error) throw toHttpError(result.error);
      return result.data.id;
    },

    async addUsage(input) {
      const result = await service().rpc('add_ai_usage', {
        p_user: input.userId,
        p_family: input.familyId,
        p_input_tokens: input.inputTokens,
        p_output_tokens: input.outputTokens,
        p_cache_read_tokens: input.cacheReadTokens,
        p_cache_write_tokens: input.cacheWriteTokens,
        p_cost_usd: input.costUsd,
      });
      if (result.error) throw toHttpError(result.error);
    },

    async touchConversation(id, title) {
      const result = await service().from('conversations').update({ title }).eq('id', id);
      if (result.error) throw toHttpError(result.error);
    },

    async search(query, embedding, ageMonths) {
      const result = await service().rpc('kb_hybrid_search', {
        p_query: query,
        ...(embedding ? { p_embedding: `[${embedding.join(',')}]` } : {}),
        ...(ageMonths === null ? {} : { p_age_months: ageMonths }),
        p_count: 6,
      });
      if (result.error) throw toHttpError(result.error);
      return result.data.map((h) => ({
        slug: h.slug,
        type: h.type,
        title: h.title,
        urlPath: h.url_path,
        evidenceLabel: h.evidence_label,
        headingPath: h.heading_path,
        body: h.body,
        ftsRank: h.fts_rank,
        ftsCoverage: h.fts_coverage,
        similarity: h.similarity,
      }));
    },
  };
}
