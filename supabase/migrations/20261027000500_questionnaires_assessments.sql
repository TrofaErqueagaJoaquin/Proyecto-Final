-- 0006 · Cuestionarios, evaluaciones, resultados y recomendaciones
-- Ver DATABASE.md §3.3 y ADR-027.
--
-- - Una versión publicada del cuestionario no se puede editar (trigger): los resultados se
--   pueden volver a explicar siempre con la misma versión.
-- - Las respuestas las escribe la familia (owner/guardian) mientras el intento está abierto.
-- - Los resultados los escribe SOLO la API, con finalize_assessment() (service_role), después
--   de puntuar con el motor de packages/domain.
-- - La caregiver no ve evaluaciones (ROLES_AND_PERMISSIONS.md §3).

-- ── Cuestionarios (catálogo versionado) ─────────────────────────────────

create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires (id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  evidence_label text not null check (evidence_label in (
    'recomendacion_oficial', 'evidencia_consolidada', 'asociacion_no_causa', 'hipotesis',
    'opinion_profesional', 'propuesta_proyecto'
  )),
  estimated_minutes integer not null check (estimated_minutes between 1 and 60),
  min_age_months integer not null check (min_age_months between 0 and 216),
  max_age_months integer not null check (max_age_months between 0 and 216),
  -- Validado con ScoringSpecSchema (packages/domain) antes de guardarse.
  scoring_spec jsonb not null,
  -- Hash del archivo de content/ que generó la versión: detecta cambios sin subir la versión.
  source_hash text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (questionnaire_id, version),
  check (min_age_months <= max_age_months),
  check (status = 'draft' or published_at is not null)
);

create table public.questionnaire_sections (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.questionnaire_versions (id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]*$'),
  title text not null check (char_length(title) between 1 and 80),
  description text,
  min_age_months integer check (min_age_months between 0 and 216),
  max_age_months integer check (max_age_months between 0 and 216),
  position integer not null check (position > 0),
  unique (version_id, code),
  unique (version_id, position)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.questionnaire_sections (id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]*$'),
  prompt text not null check (char_length(prompt) between 1 and 200),
  help_text text,
  type text not null check (type in ('single', 'multi', 'number')),
  required boolean not null default true,
  min_age_months integer check (min_age_months between 0 and 216),
  max_age_months integer check (max_age_months between 0 and 216),
  -- { question, anyOf | noneOf }: se valida con ShowIfSchema.
  show_if jsonb,
  number_min numeric,
  number_max numeric,
  number_step numeric check (number_step > 0),
  unit text,
  position integer not null check (position > 0),
  unique (section_id, code),
  unique (section_id, position),
  check ((type = 'number') = (number_min is not null and number_max is not null
                              and number_step is not null and unit is not null))
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (char_length(label) between 1 and 120),
  value numeric not null,
  position integer not null check (position > 0),
  unique (question_id, code),
  unique (question_id, position)
);

create index questionnaire_versions_status_idx on public.questionnaire_versions (questionnaire_id, status);

-- ── Intentos, respuestas y resultados (datos de la familia) ─────────────

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.questionnaire_versions (id) on delete restrict,
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  respondent_id uuid references public.profiles (id) on delete set null,
  -- Edad congelada al empezar: el resultado se explica con la edad que se usó (DATABASE.md §5.1).
  member_age_months integer not null check (member_age_months between 0 and 216),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'discarded')),
  engine_version text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'submitted' or (submitted_at is not null and engine_version is not null))
);

create index assessment_attempts_history_idx on public.assessment_attempts (member_id, submitted_at desc);
create index assessment_attempts_family_idx on public.assessment_attempts (family_id);
create index assessment_attempts_version_idx on public.assessment_attempts (version_id);
create index assessment_attempts_respondent_idx on public.assessment_attempts (respondent_id);
-- Un solo intento abierto por integrante y versión: "Continuar" retoma ese.
create unique index assessment_attempts_one_open
  on public.assessment_attempts (member_id, version_id) where status = 'in_progress';

create table public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  option_id uuid references public.question_options (id) on delete restrict,
  value_number numeric,
  created_at timestamptz not null default now(),
  check (num_nonnulls(option_id, value_number) = 1)
);

create unique index assessment_answers_unique
  on public.assessment_answers (attempt_id, question_id, option_id) nulls not distinct;
create index assessment_answers_question_idx on public.assessment_answers (question_id);
create index assessment_answers_option_idx on public.assessment_answers (option_id);

create table public.assessment_dimension_scores (
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  dimension_code text not null check (dimension_code ~ '^[a-z][a-z0-9_]*$'),
  raw_score numeric not null,
  normalized integer not null check (normalized between 0 and 100),
  band text not null check (band in ('strength', 'watch', 'priority')),
  -- Qué preguntas pesaron: [{ question, score }]. Es parte del resultado congelado.
  explanation jsonb not null default '[]'::jsonb,
  primary key (attempt_id, dimension_code)
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  rule_code text not null,
  content_item_id uuid references public.content_items (id) on delete restrict,
  activity_id uuid references public.activities (id) on delete restrict,
  priority integer not null check (priority between 1 and 5),
  reason text not null check (char_length(reason) between 1 and 200),
  status text not null default 'new' check (status in ('new', 'accepted', 'dismissed', 'done')),
  status_changed_at timestamptz,
  status_changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(content_item_id, activity_id) = 1),
  unique (attempt_id, rule_code)
);

create index recommendations_family_idx on public.recommendations (family_id, status);
create index recommendations_member_idx on public.recommendations (member_id);
create index recommendations_content_idx on public.recommendations (content_item_id);
create index recommendations_activity_idx on public.recommendations (activity_id);
create index recommendations_changed_by_idx on public.recommendations (status_changed_by);

-- ── Helpers ─────────────────────────────────────────────────────────────

-- Meses calendario completos (birth_month siempre es el día 1). Igual que ageInMonths().
create function public.age_in_months(p_birth_month date, p_on date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (extract(year from age(p_on, p_birth_month)) * 12
          + extract(month from age(p_on, p_birth_month)))::integer;
$$;

-- ¿El usuario actual puede ver y responder este intento? (owner/guardian de su familia)
create function public.can_manage_attempt(p_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assessment_attempts a
    where a.id = p_attempt_id
      and public.is_family_adult(a.family_id, array['owner', 'guardian'])
  );
$$;

-- ── Triggers ────────────────────────────────────────────────────────────

create trigger questionnaires_set_updated_at before update on public.questionnaires
  for each row execute function public.set_updated_at();
create trigger assessment_attempts_set_updated_at before update on public.assessment_attempts
  for each row execute function public.set_updated_at();

-- Una versión publicada o retirada es inmutable; solo puede pasar de publicada a retirada.
create function public.protect_questionnaire_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      perform public.raise_domain_error('QUESTIONNAIRE_LOCKED');
    end if;
    return old;
  end if;
  if old.status = 'draft' then
    return new;
  end if;
  if old.status = 'published' and new.status = 'retired'
     and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
    return new;
  end if;
  perform public.raise_domain_error('QUESTIONNAIRE_LOCKED');
  return null;
end;
$$;

create trigger questionnaire_versions_protect
  before update or delete on public.questionnaire_versions
  for each row execute function public.protect_questionnaire_version();

-- Secciones, preguntas y opciones solo cambian mientras su versión es borrador.
-- Si la versión ya no existe (borrado en cascada de un borrador), se permite.
create function public.protect_questionnaire_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb[] := array[]::jsonb[];
  v_row jsonb;
  v_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_rows := v_rows || to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_rows := v_rows || to_jsonb(new); end if;

  foreach v_row in array v_rows loop
    if tg_table_name = 'questionnaire_sections' then
      select v.status into v_status from public.questionnaire_versions v
      where v.id = (v_row ->> 'version_id')::uuid;
    elsif tg_table_name = 'questions' then
      select v.status into v_status
      from public.questionnaire_sections s
      join public.questionnaire_versions v on v.id = s.version_id
      where s.id = (v_row ->> 'section_id')::uuid;
    else
      select v.status into v_status
      from public.questions q
      join public.questionnaire_sections s on s.id = q.section_id
      join public.questionnaire_versions v on v.id = s.version_id
      where q.id = (v_row ->> 'question_id')::uuid;
    end if;
    if v_status is not null and v_status <> 'draft' then
      perform public.raise_domain_error('QUESTIONNAIRE_LOCKED');
    end if;
  end loop;
  return coalesce(new, old);
end;
$$;

create trigger questionnaire_sections_protect
  before insert or update or delete on public.questionnaire_sections
  for each row execute function public.protect_questionnaire_content();
create trigger questions_protect
  before insert or update or delete on public.questions
  for each row execute function public.protect_questionnaire_content();
create trigger question_options_protect
  before insert or update or delete on public.question_options
  for each row execute function public.protect_questionnaire_content();

-- El integrante tiene que ser de la familia del intento.
create function public.validate_assessment_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status <> 'in_progress' then
    perform public.raise_domain_error('ASSESSMENT_CLOSED');
  end if;
  if not exists (
    select 1 from public.family_members m where m.id = new.member_id and m.family_id = new.family_id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'member_from_other_family');
  end if;
  return new;
end;
$$;

create trigger assessment_attempts_validate
  before insert or update on public.assessment_attempts
  for each row execute function public.validate_assessment_attempt();

-- Respuestas: solo con el intento abierto, de preguntas de su versión y con el tipo correcto.
create function public.validate_assessment_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.assessment_attempts%rowtype;
  v_type text;
begin
  select * into v_attempt from public.assessment_attempts
  where id = case when tg_op = 'DELETE' then old.attempt_id else new.attempt_id end;
  if not found then
    -- Borrado en cascada del intento (o de la familia).
    return coalesce(new, old);
  end if;
  if v_attempt.status <> 'in_progress' then
    perform public.raise_domain_error('ASSESSMENT_CLOSED');
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;

  select q.type into v_type
  from public.questions q
  join public.questionnaire_sections s on s.id = q.section_id
  where q.id = new.question_id and s.version_id = v_attempt.version_id;
  if v_type is null then
    perform public.raise_domain_error('FORBIDDEN', 'question_from_other_version');
  end if;

  if (v_type = 'number') <> (new.value_number is not null) then
    perform public.raise_domain_error('FORBIDDEN', 'answer_type_mismatch');
  end if;
  if new.option_id is not null and not exists (
    select 1 from public.question_options o where o.id = new.option_id and o.question_id = new.question_id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'option_from_other_question');
  end if;
  if v_type = 'single' and exists (
    select 1 from public.assessment_answers a
    where a.attempt_id = new.attempt_id and a.question_id = new.question_id and a.id <> new.id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'single_choice_already_answered');
  end if;
  return new;
end;
$$;

create trigger assessment_answers_validate
  before insert or update or delete on public.assessment_answers
  for each row execute function public.validate_assessment_answer();

-- Quién y cuándo cambió el estado de una recomendación.
create function public.stamp_recommendation_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger recommendations_stamp_status
  before update on public.recommendations
  for each row execute function public.stamp_recommendation_status();

-- ── RPC ─────────────────────────────────────────────────────────────────

-- Definición de una versión en el formato de QuestionnaireDefinitionSchema (packages/domain).
-- INVOKER: RLS decide qué versiones se pueden leer.
create function public.questionnaire_definition(p_version_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('sections', coalesce(jsonb_agg(section order by position), '[]'::jsonb))
  from (
    select s.position, jsonb_strip_nulls(jsonb_build_object(
      'id', s.id,
      'code', s.code,
      'title', s.title,
      'description', s.description,
      'minAgeMonths', s.min_age_months,
      'maxAgeMonths', s.max_age_months,
      'questions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', q.id,
          'code', q.code,
          'prompt', q.prompt,
          'help', q.help_text,
          'type', q.type,
          'required', q.required,
          'minAgeMonths', q.min_age_months,
          'maxAgeMonths', q.max_age_months,
          'showIf', q.show_if,
          'number', case when q.type = 'number' then jsonb_build_object(
            'min', q.number_min, 'max', q.number_max, 'step', q.number_step, 'unit', q.unit) end,
          'options', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'id', o.id, 'code', o.code, 'label', o.label, 'value', o.value
            ) order by o.position), '[]'::jsonb)
            from public.question_options o where o.question_id = q.id
          )
        ) order by q.position), '[]'::jsonb)
        from public.questions q where q.section_id = s.id
      )
    )) as section
    from public.questionnaire_sections s
    where s.version_id = p_version_id
  ) sections;
$$;

-- Empieza (o retoma) una evaluación sobre un integrante. Congela su edad en meses.
create function public.start_assessment(p_member_id uuid, p_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.family_members%rowtype;
  v_version public.questionnaire_versions%rowtype;
  v_age integer;
  v_id uuid;
begin
  if auth.uid() is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  select * into v_member from public.family_members where id = p_member_id;
  if not found or v_member.archived_at is not null
     or not public.is_family_adult(v_member.family_id, array['owner', 'guardian']) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;

  select * into v_version from public.questionnaire_versions where id = p_version_id;
  v_age := public.age_in_months(v_member.birth_month, current_date);
  if not found or v_version.status <> 'published'
     or v_age not between v_version.min_age_months and v_version.max_age_months then
    perform public.raise_domain_error('QUESTIONNAIRE_UNAVAILABLE');
  end if;

  select id into v_id from public.assessment_attempts
  where member_id = p_member_id and version_id = p_version_id and status = 'in_progress';
  if v_id is not null then
    return v_id;
  end if;

  insert into public.assessment_attempts (version_id, family_id, member_id, respondent_id, member_age_months)
  values (p_version_id, v_member.family_id, p_member_id, auth.uid(), v_age)
  returning id into v_id;
  return v_id;
end;
$$;

-- Guarda (reemplaza) la respuesta a una pregunta: opciones elegidas o un número.
-- Sin opciones ni número, borra la respuesta. INVOKER: RLS y el trigger validan.
create function public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_option_ids uuid[],
  p_value numeric
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.assessment_answers
  where attempt_id = p_attempt_id and question_id = p_question_id;

  if p_value is not null then
    insert into public.assessment_answers (attempt_id, question_id, value_number)
    values (p_attempt_id, p_question_id, p_value);
  else
    insert into public.assessment_answers (attempt_id, question_id, option_id)
    select p_attempt_id, p_question_id, option_id
    from unnest(coalesce(p_option_ids, array[]::uuid[])) as option_id;
  end if;
end;
$$;

-- Escribe el resultado calculado por la API y cierra el intento. Solo service_role.
--   p_scores: [{ code, rawScore, normalized, band, contributions }]
--   p_recommendations: [{ rule, contentItemId | activityId, priority, reason }]
create function public.finalize_assessment(
  p_attempt_id uuid,
  p_submitted_by uuid,
  p_engine_version text,
  p_scores jsonb,
  p_recommendations jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.assessment_attempts%rowtype;
begin
  select * into v_attempt from public.assessment_attempts where id = p_attempt_id for update;
  if not found then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  if v_attempt.status = 'submitted' then
    perform public.raise_domain_error('ASSESSMENT_ALREADY_SUBMITTED');
  end if;
  if v_attempt.status <> 'in_progress' then
    perform public.raise_domain_error('ASSESSMENT_CLOSED');
  end if;
  -- Defensa en profundidad: quien envía tiene que poder gestionar la familia.
  if not exists (
    select 1 from public.family_memberships m
    where m.family_id = v_attempt.family_id and m.user_id = p_submitted_by
      and m.role in ('owner', 'guardian')
  ) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;

  insert into public.assessment_dimension_scores
    (attempt_id, dimension_code, raw_score, normalized, band, explanation)
  select p_attempt_id, s ->> 'code', (s ->> 'rawScore')::numeric, (s ->> 'normalized')::integer,
         s ->> 'band', coalesce(s -> 'contributions', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_scores, '[]'::jsonb)) s;

  insert into public.recommendations
    (family_id, member_id, attempt_id, rule_code, content_item_id, activity_id, priority, reason)
  select v_attempt.family_id, v_attempt.member_id, p_attempt_id, r ->> 'rule',
         (r ->> 'contentItemId')::uuid, (r ->> 'activityId')::uuid,
         (r ->> 'priority')::integer, r ->> 'reason'
  from jsonb_array_elements(coalesce(p_recommendations, '[]'::jsonb)) r;

  update public.assessment_attempts
  set status = 'submitted', engine_version = p_engine_version, submitted_at = now()
  where id = p_attempt_id;

  -- Sin respuestas ni puntajes en la auditoría: solo el hecho.
  insert into public.audit_log (actor_id, action, entity_type, entity_id, family_id, metadata)
  values (p_submitted_by, 'assessment.submit', 'assessment_attempt', p_attempt_id::text,
          v_attempt.family_id, jsonb_build_object('engine_version', p_engine_version));
end;
$$;

revoke execute on function public.age_in_months(date, date) from public, anon, authenticated;
revoke execute on function public.can_manage_attempt(uuid) from public, anon;
revoke execute on function public.protect_questionnaire_version() from public, anon, authenticated;
revoke execute on function public.protect_questionnaire_content() from public, anon, authenticated;
revoke execute on function public.validate_assessment_attempt() from public, anon, authenticated;
revoke execute on function public.validate_assessment_answer() from public, anon, authenticated;
revoke execute on function public.stamp_recommendation_status() from public, anon, authenticated;
revoke execute on function public.questionnaire_definition(uuid) from public, anon;
revoke execute on function public.start_assessment(uuid, uuid) from public, anon;
revoke execute on function public.save_answer(uuid, uuid, uuid[], numeric) from public, anon;
revoke execute on function public.finalize_assessment(uuid, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;

grant execute on function public.age_in_months(date, date) to service_role;
grant execute on function public.can_manage_attempt(uuid) to authenticated, service_role;
grant execute on function public.questionnaire_definition(uuid) to authenticated, service_role;
grant execute on function public.start_assessment(uuid, uuid) to authenticated;
grant execute on function public.save_answer(uuid, uuid, uuid[], numeric) to authenticated;
grant execute on function public.finalize_assessment(uuid, uuid, text, jsonb, jsonb) to service_role;

-- ── Privilegios y políticas ─────────────────────────────────────────────

alter table public.questionnaires enable row level security;
alter table public.questionnaire_versions enable row level security;
alter table public.questionnaire_sections enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.assessment_dimension_scores enable row level security;
alter table public.recommendations enable row level security;

revoke all on public.questionnaires, public.questionnaire_versions, public.questionnaire_sections,
  public.questions, public.question_options, public.assessment_attempts, public.assessment_answers,
  public.assessment_dimension_scores, public.recommendations
  from anon, authenticated;

-- Catálogo: lo carga el servidor; con cuenta se leen las versiones publicadas o retiradas
-- (las retiradas hacen falta para explicar resultados viejos).
grant select on public.questionnaires, public.questionnaire_versions, public.questionnaire_sections,
  public.questions, public.question_options
  to authenticated;

create policy questionnaires_select on public.questionnaires
  for select to authenticated
  using (exists (
    select 1 from public.questionnaire_versions v
    where v.questionnaire_id = questionnaires.id and v.status in ('published', 'retired')
  ));
create policy questionnaire_versions_select on public.questionnaire_versions
  for select to authenticated using (status in ('published', 'retired'));
create policy questionnaire_sections_select on public.questionnaire_sections
  for select to authenticated
  using (exists (
    select 1 from public.questionnaire_versions v
    where v.id = version_id and v.status in ('published', 'retired')
  ));
create policy questions_select on public.questions
  for select to authenticated
  using (exists (
    select 1 from public.questionnaire_sections s
    join public.questionnaire_versions v on v.id = s.version_id
    where s.id = section_id and v.status in ('published', 'retired')
  ));
create policy question_options_select on public.question_options
  for select to authenticated
  using (exists (
    select 1 from public.questions q
    join public.questionnaire_sections s on s.id = q.section_id
    join public.questionnaire_versions v on v.id = s.version_id
    where q.id = question_id and v.status in ('published', 'retired')
  ));

-- Intentos: los crea start_assessment(); owner/guardian los ven, los descartan o los borran.
grant select, delete on public.assessment_attempts to authenticated;
grant update (status) on public.assessment_attempts to authenticated;

create policy assessment_attempts_select on public.assessment_attempts
  for select to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));
create policy assessment_attempts_discard on public.assessment_attempts
  for update to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])))
  -- El cliente solo puede descartar: "submitted" lo pone finalize_assessment().
  with check (status = 'discarded');
create policy assessment_attempts_delete on public.assessment_attempts
  for delete to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));

grant select, delete on public.assessment_answers to authenticated;
grant insert (attempt_id, question_id, option_id, value_number) on public.assessment_answers to authenticated;

create policy assessment_answers_select on public.assessment_answers
  for select to authenticated using ((select public.can_manage_attempt(attempt_id)));
create policy assessment_answers_insert on public.assessment_answers
  for insert to authenticated with check ((select public.can_manage_attempt(attempt_id)));
create policy assessment_answers_delete on public.assessment_answers
  for delete to authenticated using ((select public.can_manage_attempt(attempt_id)));

-- Resultados: solo lectura para la familia (los escribe finalize_assessment()).
grant select on public.assessment_dimension_scores to authenticated;

create policy assessment_dimension_scores_select on public.assessment_dimension_scores
  for select to authenticated using ((select public.can_manage_attempt(attempt_id)));

grant select on public.recommendations to authenticated;
grant update (status) on public.recommendations to authenticated;

create policy recommendations_select on public.recommendations
  for select to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));
create policy recommendations_update on public.recommendations
  for update to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])))
  with check ((select public.is_family_adult(family_id, array['owner', 'guardian'])));
