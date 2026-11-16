-- 0014 · Ajustes a la carga desde el panel (ADR-036), después de la revisión de código.
-- 1. Una fuente cargada en el panel no es pública hasta que la cite algo publicado.
-- 2. Quien edita contenido ve los borradores completos (pasos, categorías y fuentes).
-- 3. La excepción de segundo factor de la demo se limita a lo cargado en el panel: el catálogo
--    del repositorio y los cuestionarios siguen pidiendo segundo factor.
-- 4. Validación explícita de los datos del formulario (tipos y opciones) antes de convertirlos.

-- ── 1. Fuentes ──────────────────────────────────────────────────────────

drop policy sources_select on public.sources;
create policy sources_select on public.sources
  for select to anon, authenticated
  using (
    origin = 'repo'
    or exists (
      select 1 from public.activity_sources s
      join public.activities a on a.id = s.activity_id
      where s.source_id = sources.id and a.status = 'published'
    )
    or exists (
      select 1 from public.content_sources s
      join public.content_items c on c.id = s.content_id
      where s.source_id = sources.id and c.status = 'published'
    )
  );
create policy sources_select_admin on public.sources
  for select to authenticated using ((select public.has_admin_permission('content.edit')));

-- ── 2. Borradores completos para quien edita ────────────────────────────

create policy activity_steps_select_admin on public.activity_steps
  for select to authenticated using ((select public.has_admin_permission('content.edit')));
create policy activity_category_links_select_admin on public.activity_category_links
  for select to authenticated using ((select public.has_admin_permission('content.edit')));
create policy activity_sources_select_admin on public.activity_sources
  for select to authenticated using ((select public.has_admin_permission('content.edit')));
create policy content_sources_select_admin on public.content_sources
  for select to authenticated using ((select public.has_admin_permission('content.edit')));

-- ── 3. Excepción de la demo, más acotada ────────────────────────────────

-- ¿La sesión entró con segundo factor?
create function public.session_has_mfa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

revoke execute on function public.session_has_mfa() from public, anon, authenticated;

create or replace function public.admin_mfa_satisfied(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.session_has_mfa()
      or (p_code in ('content.edit', 'content.publish') and public.is_demo_environment());
$$;

-- Publicar o archivar sin segundo factor (solo en la demo) vale solo para lo cargado en el panel.
create or replace function public.admin_set_content_status(p_kind text, p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
  v_origin text;
begin
  if p_kind not in ('content', 'activity') or p_status not in ('draft', 'in_review', 'published', 'archived') then
    perform public.raise_domain_error('VALIDATION_ERROR');
  end if;
  perform public.require_admin_permission(
    case when p_status in ('published', 'archived') then 'content.publish' else 'content.edit' end);

  if p_kind = 'content' then
    select origin into v_origin from public.content_items where id = p_id;
  else
    select origin into v_origin from public.activities where id = p_id;
  end if;
  if v_origin is null then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  if v_origin <> 'panel' and not public.session_has_mfa() then
    perform public.raise_domain_error('MFA_REQUIRED');
  end if;

  if p_kind = 'content' then
    update public.content_items
      set status = p_status,
          published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end
      where id = p_id
      returning slug into v_slug;
  else
    update public.activities
      set status = p_status,
          published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end
      where id = p_id
      returning slug into v_slug;
  end if;
  if p_status in ('published', 'archived') then
    perform public.log_audit('content.' || p_status, p_kind, p_id::text, null,
      jsonb_build_object('slug', v_slug));
  end if;
end;
$$;

-- Los cuestionarios siempre piden segundo factor, también en la demo.
create or replace function public.admin_publish_questionnaire(p_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.questionnaire_versions;
begin
  perform public.require_admin_permission('content.publish');
  if not public.session_has_mfa() then
    perform public.raise_domain_error('MFA_REQUIRED');
  end if;
  select * into v_row from public.questionnaire_versions where id = p_version for update;
  if v_row.id is null then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  if v_row.status <> 'draft' then
    perform public.raise_domain_error('QUESTIONNAIRE_LOCKED');
  end if;
  update public.questionnaire_versions set status = 'retired'
    where questionnaire_id = v_row.questionnaire_id and status = 'published';
  update public.questionnaire_versions set status = 'published', published_at = now()
    where id = p_version;
  perform public.log_audit('questionnaire.published', 'questionnaire_version', p_version::text,
    null, jsonb_build_object('version', v_row.version));
end;
$$;

-- ── 4. Validación de los formularios ────────────────────────────────────

-- Número entero de un JSON (o null si es opcional y no vino).
create function public.panel_int(p jsonb, p_key text, p_required boolean)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value jsonb := p -> p_key;
begin
  if v_value is null or jsonb_typeof(v_value) = 'null' then
    if p_required then
      perform public.raise_domain_error('VALIDATION_ERROR', p_key);
    end if;
    return null;
  end if;
  if jsonb_typeof(v_value) <> 'number' or (v_value #>> '{}') !~ '^-?[0-9]{1,6}$' then
    perform public.raise_domain_error('VALIDATION_ERROR', p_key);
  end if;
  return (v_value #>> '{}')::integer;
end;
$$;

-- Verdadero o falso de un JSON (falso si no vino).
create function public.panel_bool(p jsonb, p_key text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value jsonb := p -> p_key;
begin
  if v_value is null or jsonb_typeof(v_value) = 'null' then
    return false;
  end if;
  if jsonb_typeof(v_value) <> 'boolean' then
    perform public.raise_domain_error('VALIDATION_ERROR', p_key);
  end if;
  return (v_value #>> '{}')::boolean;
end;
$$;

-- Una de las opciones permitidas (o la de por defecto si no vino).
create function public.panel_choice(p jsonb, p_key text, p_options text[], p_default text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value text := coalesce(nullif(btrim(p ->> p_key), ''), p_default);
begin
  if not (v_value = any (p_options)) then
    perform public.raise_domain_error('VALIDATION_ERROR', p_key);
  end if;
  return v_value;
end;
$$;

revoke execute on function public.panel_int(jsonb, text, boolean) from public, anon, authenticated;
revoke execute on function public.panel_bool(jsonb, text) from public, anon, authenticated;
revoke execute on function public.panel_choice(jsonb, text, text[], text) from public, anon, authenticated;

-- Identificadores de fuentes con forma de UUID y existentes.
create or replace function public.panel_source_ids(p_value jsonb)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_list text[] := public.panel_text_list(p_value, 20);
  v_ids uuid[];
begin
  if exists (
    select 1 from unnest(v_list) as item
    where item !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    perform public.raise_domain_error('VALIDATION_ERROR', 'sources');
  end if;
  v_ids := v_list::uuid[];
  if (select count(*) from public.sources where id = any (v_ids)) <> cardinality(v_ids) then
    perform public.raise_domain_error('VALIDATION_ERROR', 'sources');
  end if;
  return v_ids;
end;
$$;

create or replace function public.admin_create_source(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
  v_url text;
begin
  perform public.require_admin_permission('content.edit');
  v_url := nullif(btrim(p ->> 'url'), '');
  if v_url is not null and v_url !~ '^https://\S+$' then
    perform public.raise_domain_error('VALIDATION_ERROR', 'url');
  end if;
  v_slug := public.panel_unique_slug('source', p ->> 'slug');
  insert into public.sources (slug, citation, study_type, year, url, confidence, notes, origin,
    created_by)
  values (
    v_slug,
    public.panel_required_text(p, 'citation'),
    public.panel_choice(p, 'study_type', array['guideline', 'meta_analysis', 'systematic_review',
      'cohort', 'rct', 'cross_sectional', 'statute', 'report', 'position_statement', 'other'], 'other'),
    public.panel_int(p, 'year', false),
    v_url,
    public.panel_choice(p, 'confidence', array['high', 'moderate', 'low', 'hypothesis'], 'moderate'),
    nullif(btrim(p ->> 'notes'), ''),
    'panel',
    auth.uid()
  )
  returning id into v_id;
  perform public.log_audit('content.created', 'source', v_id::text, null,
    jsonb_build_object('slug', v_slug));
  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

create or replace function public.admin_create_activity(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publish boolean;
  v_steps text[];
  v_categories text[];
  v_sources uuid[];
  v_summary text;
  v_evidence text[] := array['recomendacion_oficial', 'evidencia_consolidada',
    'asociacion_no_causa', 'hipotesis', 'opinion_profesional', 'propuesta_proyecto'];
  v_id uuid;
  v_slug text;
begin
  perform public.require_admin_permission('content.edit');
  v_publish := public.panel_bool(p, 'publish');
  if v_publish then
    perform public.require_admin_permission('content.publish');
  end if;
  v_steps := public.panel_text_list(p -> 'steps', 12);
  v_categories := public.panel_text_list(p -> 'categories', 4);
  v_sources := public.panel_source_ids(p -> 'source_ids');
  v_summary := public.panel_required_text(p, 'summary');
  if cardinality(v_steps) = 0 or cardinality(v_categories) = 0
     or (select count(*) from public.activity_categories where code = any (v_categories))
        <> cardinality(v_categories) then
    perform public.raise_domain_error('VALIDATION_ERROR', 'steps_or_categories');
  end if;

  v_slug := public.panel_unique_slug('activity', p ->> 'slug');
  insert into public.activities (slug, title, summary, objective, age_min_months, age_max_months,
    duration_min, cost_level, space, materials, variants, safety_notes, evidence_label, status,
    published_at, origin, created_by)
  values (
    v_slug,
    public.panel_required_text(p, 'title'),
    v_summary,
    coalesce(nullif(btrim(p ->> 'objective'), ''), v_summary),
    public.panel_int(p, 'age_min_months', true),
    public.panel_int(p, 'age_max_months', true),
    public.panel_int(p, 'duration_min', true),
    public.panel_choice(p, 'cost_level', array['free', 'low', 'medium'], 'free'),
    public.panel_choice(p, 'space', array['small_indoor', 'indoor', 'outdoor'], 'indoor'),
    public.panel_text_list(p -> 'materials', 20),
    public.panel_text_list(p -> 'variants', 10),
    nullif(btrim(p ->> 'safety_notes'), ''),
    public.panel_choice(p, 'evidence_label', v_evidence, 'propuesta_proyecto'),
    case when v_publish then 'published' else 'draft' end,
    case when v_publish then now() end,
    'panel',
    auth.uid()
  )
  returning id into v_id;

  insert into public.activity_steps (activity_id, position, body)
    select v_id, t.n, t.body from unnest(v_steps) with ordinality as t (body, n);
  insert into public.activity_category_links (activity_id, category_code)
    select v_id, code from unnest(v_categories) as code;
  insert into public.activity_sources (activity_id, source_id)
    select v_id, source_id from unnest(v_sources) as source_id;

  perform public.log_audit('content.created', 'activity', v_id::text, null,
    jsonb_build_object('slug', v_slug, 'published', v_publish));
  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

create or replace function public.admin_create_content_item(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publish boolean;
  v_sources uuid[];
  v_body text;
  v_id uuid;
  v_slug text;
begin
  perform public.require_admin_permission('content.edit');
  v_publish := public.panel_bool(p, 'publish');
  if v_publish then
    perform public.require_admin_permission('content.publish');
  end if;
  v_sources := public.panel_source_ids(p -> 'source_ids');
  v_body := public.panel_required_text(p, 'body_md');
  if v_body ~* '</?[a-z][^>]*>' then
    perform public.raise_domain_error('VALIDATION_ERROR', 'body_md');
  end if;

  v_slug := public.panel_unique_slug('content', p ->> 'slug');
  insert into public.content_items (slug, type, title, summary, body_md, age_min_months,
    age_max_months, evidence_label, status, published_at, origin, created_by)
  values (
    v_slug,
    public.panel_choice(p, 'type', array['guide', 'age_stage', 'situation_card',
      'when_to_consult', 'local_resource', 'glossary'], 'situation_card'),
    public.panel_required_text(p, 'title'),
    public.panel_required_text(p, 'summary'),
    v_body,
    public.panel_int(p, 'age_min_months', false),
    public.panel_int(p, 'age_max_months', false),
    public.panel_choice(p, 'evidence_label', array['recomendacion_oficial',
      'evidencia_consolidada', 'asociacion_no_causa', 'hipotesis', 'opinion_profesional',
      'propuesta_proyecto'], 'propuesta_proyecto'),
    case when v_publish then 'published' else 'draft' end,
    case when v_publish then now() end,
    'panel',
    auth.uid()
  )
  returning id into v_id;

  insert into public.content_revisions (content_id, revision, body_md, edited_by)
    values (v_id, 1, v_body, auth.uid());
  insert into public.content_sources (content_id, source_id)
    select v_id, source_id from unnest(v_sources) as source_id;

  perform public.log_audit('content.created', 'content', v_id::text, null,
    jsonb_build_object('slug', v_slug, 'published', v_publish));
  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;
