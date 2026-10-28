import {
  ageInMonths,
  generatePlan,
  mondayOf,
  PLAN_GENERATOR_VERSION,
  type PlanInput,
  type PlanItem,
} from '@crecer/domain';
import { GeneratePlanRequestSchema, type GeneratePlanResponse } from '@crecer/shared';
import { Hono } from 'hono';

import type { AuthorizationPort } from '../../auth/authorization';
import type { Env } from '../../env';
import { toHttpError } from '../../lib/db-errors';
import { errorResponse } from '../../lib/http';
import { createUserClient } from '../../lib/supabase';
import type { AppBindings, AuthContext } from '../../types';

/** Lecturas y escritura con el JWT de la persona: RLS decide qué ve y save_week_plan verifica el rol. */
export interface PlansPort {
  loadInput(
    auth: AuthContext,
    familyId: string,
    memberId: string | null,
    weekStart: string,
    now: Date,
  ): Promise<Omit<PlanInput, 'weekStart'>>;
  save(
    auth: AuthContext,
    input: { familyId: string; memberId: string | null; weekStart: string; items: PlanItem[] },
  ): Promise<string>;
}

const RECENT_DAYS = 14;

export function createSupabasePlans(env: Env): PlansPort {
  return {
    async loadInput(auth, familyId, memberId, _weekStart, now) {
      const db = createUserClient(env, auth.token);
      const since = new Date(now.getTime() - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
      const membersQuery = db
        .from('family_members')
        .select('id, birth_month')
        .eq('family_id', familyId)
        .is('archived_at', null);
      let recsQuery = db
        .from('recommendations')
        .select('activity_id, priority')
        .eq('family_id', familyId)
        .in('status', ['new', 'accepted'])
        .not('activity_id', 'is', null)
        .order('priority');
      if (memberId) recsQuery = recsQuery.eq('member_id', memberId);

      const [members, preferences, activities, recs, logs] = await Promise.all([
        memberId ? membersQuery.eq('id', memberId) : membersQuery,
        db
          .from('family_preferences')
          .select('minutes_per_day, space, budget, interests')
          .eq('family_id', familyId)
          .maybeSingle(),
        db
          .from('activities')
          .select(
            'id, title, age_min_months, age_max_months, duration_min, cost_level, space, materials, activity_category_links (category_code)',
          )
          .eq('status', 'published'),
        recsQuery,
        db
          .from('activity_logs')
          .select('activity_id')
          .eq('family_id', familyId)
          .gte('done_on', since),
      ]);
      for (const result of [members, preferences, activities, recs, logs]) {
        if (result.error) throw toHttpError(result.error);
      }

      const p = preferences.data;
      return {
        agesMonths: (members.data ?? []).map((m) => ageInMonths(m.birth_month, now)),
        preferences: {
          minutesPerDay: p?.minutes_per_day ?? null,
          space: (p?.space ?? null) as PlanInput['preferences']['space'],
          budget: (p?.budget ?? null) as PlanInput['preferences']['budget'],
          interests: p?.interests ?? [],
        },
        activities: (activities.data ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          ageMinMonths: a.age_min_months,
          ageMaxMonths: a.age_max_months,
          durationMin: a.duration_min,
          costLevel: a.cost_level as PlanInput['activities'][number]['costLevel'],
          space: a.space as PlanInput['activities'][number]['space'],
          materialsCount: a.materials.length,
          categories: a.activity_category_links.map((l) => l.category_code),
        })),
        recommendedActivityIds: [
          ...new Set((recs.data ?? []).flatMap((r) => (r.activity_id ? [r.activity_id] : []))),
        ],
        recentlyDoneIds: (logs.data ?? []).map((l) => l.activity_id),
      };
    },
    async save(auth, input) {
      const result = await createUserClient(env, auth.token).rpc('save_week_plan', {
        p_family: input.familyId,
        // null = plan de la familia: la función lo acepta, aunque el tipo generado pida texto.
        p_member: input.memberId as string,
        p_week_start: input.weekStart,
        p_generator_version: PLAN_GENERATOR_VERSION,
        p_items: input.items.map((i) => ({
          activity_id: i.activityId,
          scheduled_for: i.scheduledFor,
          reason: i.reason,
        })),
      });
      if (result.error) throw toHttpError(result.error);
      return result.data;
    },
  };
}

export function plansRoute(deps: {
  plans: PlansPort;
  authorization: AuthorizationPort;
  now: () => Date;
}) {
  const route = new Hono<AppBindings>();

  route.post('/v1/plans/generate', async (c) => {
    const auth = c.get('auth');
    const parsed = GeneratePlanRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', 'Pedido inválido.');
    const { familyId, memberId } = parsed.data;
    if (!(await deps.authorization.isFamilyAdult(auth, familyId, ['owner', 'guardian']))) {
      return errorResponse(
        c,
        403,
        'FORBIDDEN',
        'Solo los responsables de la familia arman el plan.',
      );
    }

    const now = deps.now();
    const weekStart = mondayOf(parsed.data.weekStart ?? now.toISOString().slice(0, 10));
    const input = await deps.plans.loadInput(auth, familyId, memberId, weekStart, now);
    const items = generatePlan({ ...input, weekStart });
    if (items.length === 0) {
      return errorResponse(
        c,
        409,
        'CONFLICT',
        'No encontramos actividades que entren en su tiempo, espacio y presupuesto. Probá cambiar las preferencias.',
      );
    }
    const planId = await deps.plans.save(auth, { familyId, memberId, weekStart, items });
    const body: GeneratePlanResponse = { planId, weekStart, items: items.length };
    return c.json(body);
  });

  return route;
}
