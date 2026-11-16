-- 0013 · Carga de contenidos desde el panel de administración (ADR-036).
-- Hasta ahora el catálogo (actividades, fichas y fuentes) se cargaba solo desde content/ con la
-- sincronización. Ahora también desde Administración → Contenidos, con un formulario. Cada fila
-- recuerda de dónde vino (origin) para que la sincronización no archive lo cargado en el panel.

alter table public.sources
  add column origin text not null default 'repo' check (origin in ('repo', 'panel')),
  add column created_by uuid references public.profiles (id) on delete set null;
alter table public.content_items
  add column origin text not null default 'repo' check (origin in ('repo', 'panel')),
  add column created_by uuid references public.profiles (id) on delete set null;
alter table public.activities
  add column origin text not null default 'repo' check (origin in ('repo', 'panel')),
  add column created_by uuid references public.profiles (id) on delete set null;

create index sources_created_by_idx on public.sources (created_by);
create index content_items_created_by_idx on public.content_items (created_by);
create index activities_created_by_idx on public.activities (created_by);

-- ── Demo: cargar contenido sin segundo factor ───────────────────────────
-- En la demo de la Expotec, quien prueba la carga (el profe) entra solo con contraseña. La
-- excepción vale SOLO si la base está marcada como demo (app_settings app.environment = "demo",
-- que se carga a mano: admin_update_setting acepta solo claves conocidas) y SOLO para los permisos de
-- contenido. Usuarios, roles, verificaciones, configuración y auditoría siguen pidiendo segundo
-- factor siempre; en desarrollo y producción no cambia nada.

create function public.is_demo_environment()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select value #>> '{}' from public.app_settings where key = 'app.environment') = 'demo',
    false);
$$;

revoke execute on function public.is_demo_environment() from public, anon;
grant execute on function public.is_demo_environment() to authenticated;

-- ¿La sesión cumple el segundo factor que pide este permiso?
create function public.admin_mfa_satisfied(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or (p_code in ('content.edit', 'content.review', 'content.publish')
          and public.is_demo_environment());
$$;

revoke execute on function public.admin_mfa_satisfied(text) from public, anon, authenticated;

create or replace function public.has_admin_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission(p_code) and public.admin_mfa_satisfied(p_code);
$$;

create or replace function public.require_admin_permission(p_code text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  if not public.has_permission(p_code) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  if not public.admin_mfa_satisfied(p_code) then
    perform public.raise_domain_error('MFA_REQUIRED');
  end if;
end;
$$;

-- ── Ayudas para los formularios ─────────────────────────────────────────

-- Lista de textos de un JSON (vacíos afuera). Más de p_max elementos, o algo que no es una
-- lista, es un error de validación.
create function public.panel_text_list(p_value jsonb, p_max integer)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_list text[];
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return '{}';
  end if;
  if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) > p_max then
    perform public.raise_domain_error('VALIDATION_ERROR', 'list');
  end if;
  select coalesce(array_agg(btrim(t.item) order by t.n), '{}')
    into v_list
    from jsonb_array_elements_text(p_value) with ordinality as t (item, n)
    where btrim(t.item) <> '';
  return v_list;
end;
$$;

-- Texto obligatorio (sin espacios de más) de un JSON.
create function public.panel_required_text(p jsonb, p_key text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_text text := btrim(p ->> p_key);
begin
  if v_text is null or v_text = '' then
    perform public.raise_domain_error('VALIDATION_ERROR', p_key);
  end if;
  return v_text;
end;
$$;

-- Identificador único a partir del propuesto: si ya existe, le agrega -2, -3…
create function public.panel_unique_slug(p_kind text, p_base text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_base text := btrim(left(coalesce(p_base, ''), 60), '-');
  v_slug text := v_base;
  v_n integer := 1;
begin
  if v_base !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    perform public.raise_domain_error('VALIDATION_ERROR', 'slug');
  end if;
  loop
    exit when not (
      (p_kind = 'activity' and exists (select 1 from public.activities where slug = v_slug))
      or (p_kind = 'content' and exists (select 1 from public.content_items where slug = v_slug))
      or (p_kind = 'source' and exists (select 1 from public.sources where slug = v_slug))
    );
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end;
$$;

revoke execute on function public.panel_text_list(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.panel_required_text(jsonb, text) from public, anon, authenticated;
revoke execute on function public.panel_unique_slug(text, text) from public, anon, authenticated;

-- Las fuentes elegidas tienen que existir todas.
create function public.panel_source_ids(p_value jsonb)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := public.panel_text_list(p_value, 20)::uuid[];
begin
  if (select count(*) from public.sources where id = any (v_ids)) <> cardinality(v_ids) then
    perform public.raise_domain_error('VALIDATION_ERROR', 'sources');
  end if;
  return v_ids;
end;
$$;

revoke execute on function public.panel_source_ids(jsonb) from public, anon, authenticated;

-- ── Nueva fuente ────────────────────────────────────────────────────────

create function public.admin_create_source(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
begin
  perform public.require_admin_permission('content.edit');
  v_slug := public.panel_unique_slug('source', p ->> 'slug');
  insert into public.sources (slug, citation, study_type, year, url, confidence, notes, origin,
    created_by)
  values (
    v_slug,
    public.panel_required_text(p, 'citation'),
    coalesce(p ->> 'study_type', 'other'),
    (p ->> 'year')::integer,
    nullif(btrim(p ->> 'url'), ''),
    coalesce(p ->> 'confidence', 'moderate'),
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

-- ── Nueva actividad ─────────────────────────────────────────────────────

-- Crea una actividad con sus pasos, categorías y fuentes. Queda en borrador, salvo que se pida
-- publicarla y la cuenta tenga content.publish.
create function public.admin_create_activity(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publish boolean := coalesce((p ->> 'publish')::boolean, false);
  v_steps text[];
  v_categories text[];
  v_sources uuid[];
  v_summary text;
  v_id uuid;
  v_slug text;
begin
  perform public.require_admin_permission('content.edit');
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
    (p ->> 'age_min_months')::integer,
    (p ->> 'age_max_months')::integer,
    (p ->> 'duration_min')::integer,
    coalesce(p ->> 'cost_level', 'free'),
    coalesce(p ->> 'space', 'indoor'),
    public.panel_text_list(p -> 'materials', 20),
    public.panel_text_list(p -> 'variants', 10),
    nullif(btrim(p ->> 'safety_notes'), ''),
    coalesce(p ->> 'evidence_label', 'propuesta_proyecto'),
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

-- ── Nueva ficha (contenido de la biblioteca) ────────────────────────────

create function public.admin_create_content_item(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publish boolean := coalesce((p ->> 'publish')::boolean, false);
  v_sources uuid[];
  v_body text;
  v_id uuid;
  v_slug text;
begin
  perform public.require_admin_permission('content.edit');
  if v_publish then
    perform public.require_admin_permission('content.publish');
  end if;
  v_sources := public.panel_source_ids(p -> 'source_ids');
  v_body := public.panel_required_text(p, 'body_md');

  v_slug := public.panel_unique_slug('content', p ->> 'slug');
  insert into public.content_items (slug, type, title, summary, body_md, age_min_months,
    age_max_months, evidence_label, status, published_at, origin, created_by)
  values (
    v_slug,
    coalesce(p ->> 'type', 'guide'),
    public.panel_required_text(p, 'title'),
    public.panel_required_text(p, 'summary'),
    v_body,
    (p ->> 'age_min_months')::integer,
    (p ->> 'age_max_months')::integer,
    coalesce(p ->> 'evidence_label', 'propuesta_proyecto'),
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

revoke execute on function public.admin_create_source(jsonb) from public, anon;
revoke execute on function public.admin_create_activity(jsonb) from public, anon;
revoke execute on function public.admin_create_content_item(jsonb) from public, anon;
grant execute on function public.admin_create_source(jsonb) to authenticated;
grant execute on function public.admin_create_activity(jsonb) to authenticated;
grant execute on function public.admin_create_content_item(jsonb) to authenticated;
