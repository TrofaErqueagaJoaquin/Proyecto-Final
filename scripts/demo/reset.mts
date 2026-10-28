// Deja el proyecto demo en el estado exacto del guion (EXPOTEC_DEMO.md §3 y §5).
//
//   pnpm demo:reset
//
// Solo corre contra crecer-demo (ver guards.ts) y pide escribir RESET DEMO. Las contraseñas de las
// cuentas se generan en cada reinicio y se muestran SOLO en esta terminal: guardalas en tu gestor.

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
  ageInMonths,
  answersFromRows,
  generatePlan,
  mondayOf,
  PLAN_GENERATOR_VERSION,
  QuestionnaireDefinitionSchema,
  recommend,
  scoreAttempt,
  ScoringSpecSchema,
  type PlanInput,
  type QuestionnaireDefinition,
} from '@crecer/domain';
import { CURRENT_POLICY_VERSION, type Json } from '@crecer/shared';

import { ConversationFixtureSchema } from './fixtures.ts';
import { DEMO_EMAIL_DOMAIN } from './guards.ts';
import { demoId, enforceGuards, must, ok, service, sessionFor, type Db } from './lib.ts';
import {
  email,
  OBSERVATIONS,
  PROFESSIONALS,
  SOFI,
  SOFI_GOAL,
  TOMI_FIRST,
  TOMI_SECOND,
  USERS,
  type Answers,
} from './scenario.ts';

const startedAt = Date.now();
const DAY = 86_400_000;
const now = new Date();
const iso = (date: Date) => date.toISOString();
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
/** Primer día del mes, `months` meses atrás (birth_month siempre es el día 1). */
const monthsAgo = (months: number) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  return isoDay(d);
};
const step = (text: string) => {
  console.log(`· ${text}`);
};

await enforceGuards(
  'Se borran TODAS las cuentas (salvo administración) y familias del proyecto demo',
);

// ── 1. Vaciar ───────────────────────────────────────────────────────────

step('Borrando familias y cuentas');
ok(
  await service.from('families').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  'families',
);
const staffEmails = new Set(USERS.filter((u) => u.staff).map((u) => email(u.key)));
const existingStaff = new Map<string, string>();
for (let page = 1; ; page++) {
  const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  for (const user of data.users) {
    if (user.email && staffEmails.has(user.email)) {
      existingStaff.set(user.email, user.id);
      continue;
    }
    const deleted = await service.auth.admin.deleteUser(user.id);
    if (deleted.error) throw new Error(`Borrar ${user.id}: ${deleted.error.message}`);
  }
  if (data.users.length < 200) break;
}

// ── 2. Contenido y base de conocimiento ─────────────────────────────────

for (const script of ['scripts/content-sync.mts', 'scripts/kb-ingest.mts']) {
  step(`Corriendo ${script}`);
  const run = spawnSync('pnpm', ['exec', 'tsx', script], { stdio: 'inherit', shell: true });
  if (run.status !== 0) throw new Error(`${script} terminó con error`);
}

// ── 3. Cuentas ──────────────────────────────────────────────────────────

step('Creando cuentas');
const ids: Record<string, string> = {};
const passwords: [string, string][] = [];
for (const user of USERS) {
  const address = email(user.key);
  const kept = existingStaff.get(address);
  if (kept) {
    ids[user.key] = kept;
    passwords.push([address, '(sin cambios: cuenta de administración)']);
    continue;
  }
  const password = randomBytes(12).toString('base64url');
  const created = await service.auth.admin.createUser({
    id: demoId(`user:${user.key}`),
    email: address,
    password,
    email_confirm: true,
    user_metadata: { full_name: user.name },
  });
  if (created.error) throw new Error(`Crear ${address}: ${created.error.message}`);
  ids[user.key] = created.data.user.id;
  passwords.push([address, password]);
}
const id = (key: string) => {
  const value = ids[key];
  if (!value) throw new Error(`Falta la cuenta ${key}`);
  return value;
};

for (const user of USERS.filter((u) => u.staff)) {
  ok(
    await service
      .from('user_roles')
      .upsert({ user_id: id(user.key), role_code: user.staff ?? '' }, { ignoreDuplicates: true }),
    'user_roles',
  );
}
ok(
  await service.from('consents').insert(
    USERS.filter((u) => !existingStaff.has(email(u.key))).map((u) => ({
      purpose: 'terms_privacy',
      granted_by: id(u.key),
      policy_version: CURRENT_POLICY_VERSION,
    })),
  ),
  'consents terms_privacy',
);
// Laura guarda el historial del asistente (la conversación precargada dura 90 días).
ok(
  await service.from('consents').insert({
    purpose: 'chat_history',
    granted_by: id('laura'),
    policy_version: CURRENT_POLICY_VERSION,
  }),
  'consents chat_history',
);

// ── 4. Familias ─────────────────────────────────────────────────────────

step('Creando las familias García y Pereyra');
const garcia = demoId('family:garcia');
const pereyra = demoId('family:pereyra');
const tomi = demoId('member:tomi');
const sofi = demoId('member:sofi');
const juli = demoId('member:juli');

ok(
  await service.from('families').insert([
    {
      id: garcia,
      name: 'Familia García',
      created_by: id('laura'),
      chat_history_enabled: true,
      chat_retention_days: 90,
    },
    { id: pereyra, name: 'Familia Pereyra', created_by: id('carla') },
  ]),
  'families',
);
ok(
  await service.from('family_memberships').insert([
    { family_id: garcia, user_id: id('laura'), role: 'owner', relationship: 'madre' },
    {
      family_id: garcia,
      user_id: id('diego'),
      role: 'guardian',
      relationship: 'padre',
      invited_by: id('laura'),
    },
    {
      family_id: garcia,
      user_id: id('norma'),
      role: 'caregiver',
      relationship: 'abuela',
      invited_by: id('laura'),
    },
    { family_id: pereyra, user_id: id('carla'), role: 'owner', relationship: 'madre' },
  ]),
  'family_memberships',
);
ok(
  await service.from('family_preferences').insert([
    {
      family_id: garcia,
      minutes_per_day: 30,
      space: 'indoor',
      budget: 'low',
      interests: ['movimiento', 'arte', 'lectura'],
    },
    { family_id: pereyra, minutes_per_day: 20, space: 'small_indoor', budget: 'free' },
  ]),
  'family_preferences',
);
ok(
  await service.from('family_members').insert([
    {
      id: tomi,
      family_id: garcia,
      alias: 'Tomi',
      birth_month: monthsAgo(51),
      interests: ['dinosaurios', 'bloques'],
    },
    {
      id: sofi,
      family_id: garcia,
      alias: 'Sofi',
      birth_month: monthsAgo(136),
      interests: ['música', 'dibujo'],
    },
    { id: juli, family_id: pereyra, alias: 'Juli', birth_month: monthsAgo(88) },
  ]),
  'family_members',
);
ok(
  await service.from('consents').insert([
    ...[tomi, sofi].map((member) => ({
      purpose: 'child_data',
      family_id: garcia,
      member_id: member,
      granted_by: id('laura'),
      policy_version: CURRENT_POLICY_VERSION,
    })),
    {
      purpose: 'child_data',
      family_id: pereyra,
      member_id: juli,
      granted_by: id('carla'),
      policy_version: CURRENT_POLICY_VERSION,
    },
    {
      purpose: 'ai_personal_context',
      family_id: garcia,
      granted_by: id('laura'),
      policy_version: CURRENT_POLICY_VERSION,
    },
  ]),
  'consents de la familia',
);

// ── 5. Evaluaciones ─────────────────────────────────────────────────────

step('Cargando evaluaciones');
const version = must(
  await service
    .from('questionnaire_versions')
    .select('id, scoring_spec, questionnaires!inner (slug)')
    .eq('questionnaires.slug', 'habitos')
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .single(),
  'questionnaire_versions',
);
const definition: QuestionnaireDefinition = QuestionnaireDefinitionSchema.parse(
  must(
    await service.rpc('questionnaire_definition', { p_version_id: version.id }),
    'questionnaire_definition',
  ),
);
const spec = ScoringSpecSchema.parse(version.scoring_spec);
const questions = new Map(definition.sections.flatMap((s) => s.questions).map((q) => [q.code, q]));

async function submitAssessment(input: {
  familyId: string;
  memberId: string;
  birthMonth: string;
  respondent: string;
  answers: Answers;
  submittedDaysAgo: number;
}) {
  const startedOn = daysAgo(input.submittedDaysAgo);
  const age = ageInMonths(input.birthMonth, startedOn);
  const attempt = must(
    await service
      .from('assessment_attempts')
      .insert({
        version_id: version.id,
        family_id: input.familyId,
        member_id: input.memberId,
        respondent_id: input.respondent,
        member_age_months: age,
        started_at: iso(new Date(startedOn.getTime() - 6 * 60_000)),
      })
      .select('id')
      .single(),
    'assessment_attempts',
  ).id;

  type AnswerRow = { questionId: string; optionId: string | null; valueNumber: number | null };
  const rows = Object.entries(input.answers).flatMap(([code, value]): AnswerRow[] => {
    const question = questions.get(code);
    if (!question?.id) throw new Error(`Pregunta desconocida: ${code}`);
    const questionId = question.id;
    if (typeof value === 'number') return [{ questionId, optionId: null, valueNumber: value }];
    return (Array.isArray(value) ? value : [value]).map((optionCode) => {
      const option = question.options.find((o) => o.code === optionCode);
      if (!option?.id) throw new Error(`Opción desconocida: ${code}.${optionCode}`);
      return { questionId, optionId: option.id, valueNumber: null };
    });
  });
  ok(
    await service.from('assessment_answers').insert(
      rows.map((r) => ({
        attempt_id: attempt,
        question_id: r.questionId,
        option_id: r.optionId,
        value_number: r.valueNumber,
      })),
    ),
    'assessment_answers',
  );

  // Mismo cálculo que POST /v1/assessments/:id/submit, con la fecha del escenario.
  const answers = answersFromRows(definition, rows);
  const result = scoreAttempt(definition, spec, age, answers);
  if (result.missingRequired.length > 0) {
    throw new Error(`Faltan respuestas: ${result.missingRequired.join(', ')}`);
  }
  const recs = recommend(definition, spec, age, answers, result);
  const [content, activities] = await Promise.all([
    service.from('content_items').select('id, slug').eq('status', 'published'),
    service.from('activities').select('id, slug').eq('status', 'published'),
  ]);
  const contentIds = new Map(must(content, 'content_items').map((c) => [c.slug, c.id]));
  const activityIds = new Map(must(activities, 'activities').map((a) => [a.slug, a.id]));

  ok(
    await service
      .from('assessment_attempts')
      .update({
        status: 'submitted',
        engine_version: result.engineVersion,
        submitted_at: iso(startedOn),
      })
      .eq('id', attempt),
    'assessment_attempts (envío)',
  );
  ok(
    await service.from('assessment_dimension_scores').insert(
      result.dimensions.map((d) => ({
        attempt_id: attempt,
        dimension_code: d.code,
        raw_score: d.rawScore,
        normalized: d.normalized,
        band: d.band,
        explanation: JSON.parse(JSON.stringify(d.contributions)) as Json,
      })),
    ),
    'assessment_dimension_scores',
  );
  const recRows = recs.flatMap((r) => {
    const target =
      'contentSlug' in r.target
        ? { content_item_id: contentIds.get(r.target.contentSlug) ?? null, activity_id: null }
        : { content_item_id: null, activity_id: activityIds.get(r.target.activitySlug) ?? null };
    if (!target.content_item_id && !target.activity_id) return [];
    return [
      {
        family_id: input.familyId,
        member_id: input.memberId,
        attempt_id: attempt,
        rule_code: r.rule,
        priority: r.priority,
        reason: r.reason,
        created_at: iso(startedOn),
        ...target,
      },
    ];
  });
  if (recRows.length > 0) {
    must(await service.from('recommendations').insert(recRows), 'recommendations');
  }
  ok(
    await service.from('audit_log').insert({
      actor_id: input.respondent,
      action: 'assessment.submit',
      entity_type: 'assessment_attempt',
      entity_id: attempt,
      family_id: input.familyId,
      occurred_at: iso(startedOn),
      metadata: { engine_version: result.engineVersion },
    }),
    'audit_log (evaluación)',
  );
}

await submitAssessment({
  familyId: garcia,
  memberId: tomi,
  birthMonth: monthsAgo(51),
  respondent: id('laura'),
  answers: TOMI_FIRST,
  submittedDaysAgo: 42,
});
await submitAssessment({
  familyId: garcia,
  memberId: tomi,
  birthMonth: monthsAgo(51),
  respondent: id('laura'),
  answers: TOMI_SECOND,
  submittedDaysAgo: 7,
});
await submitAssessment({
  familyId: garcia,
  memberId: sofi,
  birthMonth: monthsAgo(136),
  respondent: id('diego'),
  answers: SOFI,
  submittedDaysAgo: 21,
});

// ── 6. Profesionales y verificación ─────────────────────────────────────

step('Cargando profesionales y credenciales');
for (const pro of PROFESSIONALS) {
  const userId = id(pro.key);
  ok(
    await service.from('professional_profiles').insert({
      user_id: userId,
      display_name: pro.displayName,
      bio: pro.bio,
      modalities: pro.modalities,
      city: 'Mar del Plata',
      province: 'Buenos Aires',
      years_experience: pro.yearsExperience,
    }),
    'professional_profiles',
  );
  ok(
    await service
      .from('professional_specialties')
      .insert(pro.specialties.map((code) => ({ professional_id: userId, specialty_code: code }))),
    'professional_specialties',
  );
  const credential = must(
    await service
      .from('professional_credentials')
      .insert({
        professional_id: userId,
        kind: 'license',
        profession: pro.credential.profession,
        jurisdiction: 'Provincia de Buenos Aires',
        license_number: pro.credential.licenseNumber,
        issuer: pro.credential.issuer,
      })
      .select('id')
      .single(),
    'professional_credentials',
  ).id;
  // "Enviar a verificación" como lo hace la persona: deja el perfil en revisión.
  const { db } = await sessionFor(email(pro.key));
  ok(
    await db.from('professional_credentials').update({ status: 'submitted' }).eq('id', credential),
    'enviar credencial',
  );
  if (pro.verified) {
    ok(
      await service.rpc('verify_credential', {
        p_credential: credential,
        p_verifier: id('verificador'),
        p_method: 'colegio',
        p_result: 'verified',
        p_note: 'Matrícula ficticia de la demo',
      }),
      'verify_credential',
    );
  }
}

// ── 7. Acompañamientos y permisos ───────────────────────────────────────

step('Creando acompañamientos');
const laura = await sessionFor(email('laura'));
const carla = await sessionFor(email('carla'));
const paula = await sessionFor(email('paula'));
const martin = await sessionFor(email('martin'));

async function requestAndAccept(
  family: { db: Db },
  familyId: string,
  pro: { db: Db },
  proKey: string,
  message: string,
  grants: { member_id: string | null; scopes: string[] }[],
) {
  const assignment = must(
    await family.db.rpc('request_care', {
      p_family_id: familyId,
      p_professional_id: id(proKey),
      p_message: message,
      p_grants: grants,
      p_policy_version: CURRENT_POLICY_VERSION,
    }),
    'request_care',
  );
  ok(
    await pro.db.rpc('respond_care_request', { p_assignment: assignment, p_accept: true }),
    'respond_care_request',
  );
  return assignment;
}

const riosGarcia = await requestAndAccept(
  laura,
  garcia,
  paula,
  'paula',
  'Nos cuesta la rutina de la noche con Sofi.',
  [{ member_id: sofi, scopes: ['member_profile', 'assessments', 'goals', 'observations'] }],
);
await requestAndAccept(laura, garcia, martin, 'martin', 'Control de sueño de Tomi.', [
  { member_id: tomi, scopes: ['member_profile', 'assessments'] },
  { member_id: null, scopes: ['family_goals'] },
]);
const riosPereyra = await requestAndAccept(
  carla,
  pereyra,
  paula,
  'paula',
  'Consulta por organización de tareas.',
  [{ member_id: juli, scopes: ['member_profile', 'observations'] }],
);

for (const observation of OBSERVATIONS) {
  ok(
    await paula.db.from('professional_observations').insert({
      assignment_id: riosGarcia,
      member_id: sofi,
      author_id: id('paula'),
      ...observation,
    }),
    'professional_observations',
  );
}
ok(
  await paula.db.from('professional_observations').insert({
    assignment_id: riosPereyra,
    member_id: juli,
    author_id: id('paula'),
    visibility: 'private',
    body: 'Organiza mejor las tareas con una lista en papel. Seguir en dos semanas.',
  }),
  'professional_observations (Pereyra)',
);

// ── 8. Objetivo de Sofi ─────────────────────────────────────────────────

step('Creando el objetivo de Sofi');
const goal = must(
  await laura.db
    .from('follow_up_goals')
    .insert({
      family_id: garcia,
      member_id: sofi,
      title: SOFI_GOAL.title,
      description: SOFI_GOAL.description,
      source: 'family',
      created_by: id('laura'),
    })
    .select('id')
    .single(),
  'follow_up_goals',
).id;
ok(
  await service.from('goal_progress_entries').insert(
    SOFI_GOAL.progress.map((p) => ({
      goal_id: goal,
      author_id: id('laura'),
      note: p.note,
      progress: p.progress,
      recorded_at: iso(daysAgo(p.daysAgo)),
    })),
  ),
  'goal_progress_entries',
);

// ── 9. Plan de la semana y actividades realizadas ───────────────────────

step('Armando el plan de Tomi y las actividades realizadas');
const activityRows = must(
  await service
    .from('activities')
    .select(
      'id, slug, title, age_min_months, age_max_months, duration_min, cost_level, space, materials, activity_category_links (category_code)',
    )
    .eq('status', 'published'),
  'activities',
);
const tomiRecs = must(
  await service
    .from('recommendations')
    .select('activity_id, priority, assessment_attempts!inner (submitted_at)')
    .eq('member_id', tomi)
    .not('activity_id', 'is', null)
    .order('priority'),
  'recommendations de Tomi',
);
const recommendedIds = [
  ...new Set(tomiRecs.flatMap((r) => (r.activity_id ? [r.activity_id] : []))),
];
const tomiAge = ageInMonths(monthsAgo(51), now);
const planInput: PlanInput = {
  weekStart: mondayOf(isoDay(now)),
  agesMonths: [tomiAge],
  preferences: {
    minutesPerDay: 30,
    space: 'indoor',
    budget: 'low',
    interests: ['movimiento', 'arte', 'lectura'],
  },
  activities: activityRows.map((a) => ({
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
  recommendedActivityIds: recommendedIds,
  recentlyDoneIds: [],
};
const planItems = generatePlan(planInput);
if (planItems.length === 0) throw new Error('El generador no armó ningún plan para Tomi');
const plan = must(
  await laura.db.rpc('save_week_plan', {
    p_family: garcia,
    p_member: tomi,
    p_week_start: planInput.weekStart,
    p_generator_version: PLAN_GENERATOR_VERSION,
    p_items: planItems.map((i) => ({
      activity_id: i.activityId,
      scheduled_for: i.scheduledFor,
      reason: i.reason,
    })),
  }),
  'save_week_plan',
);

// Lo planificado antes de hoy, hecho en su día; el resto queda para mostrar "La hicimos" en vivo.
const today = isoDay(now);
const savedItems = must(
  await service
    .from('plan_items')
    .select('id, activity_id, scheduled_for')
    .eq('plan_id', plan)
    .lt('scheduled_for', today)
    .order('scheduled_for'),
  'plan_items',
);
let logsDone = 0;
for (const item of savedItems) {
  const log = must(
    await laura.db.rpc('complete_plan_item', {
      p_item: item.id,
      p_member_ids: [tomi],
      p_rating: 4 + (logsDone % 2),
    }),
    'complete_plan_item',
  );
  ok(
    await service.from('activity_logs').update({ done_on: item.scheduled_for }).eq('id', log),
    'activity_logs (fecha)',
  );
  logsDone++;
}
// Completa hasta 6 actividades realizadas con semanas anteriores.
const eligible = activityRows.filter(
  (a) => a.age_min_months <= tomiAge && a.age_max_months >= tomiAge,
);
for (let i = 0; logsDone < 6 && i < eligible.length; i++) {
  const activity = eligible[i];
  if (!activity) break;
  const log = must(
    await service
      .from('activity_logs')
      .insert({
        family_id: garcia,
        activity_id: activity.id,
        logged_by: id(i % 2 === 0 ? 'laura' : 'diego'),
        done_on: isoDay(daysAgo(9 + i * 3)),
        rating: 3 + (i % 3),
      })
      .select('id')
      .single(),
    'activity_logs',
  ).id;
  ok(
    await service.from('activity_log_participants').insert({ log_id: log, member_id: tomi }),
    'activity_log_participants',
  );
  logsDone++;
}

// ── 10. Conversación precargada ─────────────────────────────────────────

const fixturePath = new URL('./fixtures/conversation.json', import.meta.url);
const fixtureText = await readFile(fixturePath, 'utf8').catch(() => null);
if (fixtureText) {
  step('Cargando la conversación grabada con demo:capture');
  const fixture = ConversationFixtureSchema.parse(JSON.parse(fixtureText));
  const conversation = must(
    await service
      .from('conversations')
      .insert({
        id: demoId('conversation:tomi'),
        family_id: garcia,
        user_id: id('laura'),
        member_id: tomi,
        title: fixture.title,
        use_personal_context: true,
        created_at: iso(daysAgo(3)),
      })
      .select('id')
      .single(),
    'conversations',
  ).id;
  ok(
    await service.from('assistant_messages').insert(
      fixture.messages.map((m, index) => ({
        conversation_id: conversation,
        role: m.role,
        body: m.body,
        citations: m.citations as Json,
        risk_level: m.riskLevel,
        outcome: m.outcome,
        prompt_version: m.role === 'assistant' ? fixture.promptVersion : null,
        model: m.role === 'assistant' ? fixture.model : null,
        created_at: iso(new Date(daysAgo(3).getTime() + index * 20_000)),
      })),
    ),
    'assistant_messages',
  );
} else {
  console.warn(
    '! No hay scripts/demo/fixtures/conversation.json: corré pnpm demo:capture y reiniciá.',
  );
}

// ── 11. Ajustes de la demo y auditoría ──────────────────────────────────

ok(
  await service
    .from('app_settings')
    .upsert({ key: 'assistant.daily_messages', value: 100 }, { onConflict: 'key' }),
  'app_settings',
);
ok(
  await service.from('audit_log').insert({
    action: 'demo.reset',
    entity_type: 'environment',
    entity_id: 'demo',
    metadata: { seconds: Math.round((Date.now() - startedAt) / 1000) },
  }),
  'audit_log (demo.reset)',
);

console.log(
  `\nListo en ${String(Math.round((Date.now() - startedAt) / 1000))} s. Cuentas (@${DEMO_EMAIL_DOMAIN}):`,
);
console.table(passwords.map(([address, password]) => ({ cuenta: address, contraseña: password })));
console.log(
  'Guardá estas contraseñas en tu gestor: no quedan en ningún archivo. Las de administración',
  'no cambian (conservan su verificación en dos pasos).',
);
