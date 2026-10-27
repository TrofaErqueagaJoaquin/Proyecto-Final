-- 0004 · Contenido (fuentes, biblioteca, fichas) y catálogo de actividades
-- Ver DATABASE.md §3.4. Los planes y objetivos van en su propia migración (Fase 7).
-- El contenido publicado es PÚBLICO (biblioteca sin cuenta): anon solo puede leer lo publicado.

-- ── Fuentes ─────────────────────────────────────────────────────────────

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  citation text not null,
  study_type text not null check (study_type in (
    'guideline', 'meta_analysis', 'systematic_review', 'cohort', 'rct', 'cross_sectional',
    'statute', 'report', 'position_statement', 'other'
  )),
  year integer check (year between 1900 and 2100),
  doi text,
  url text check (url is null or url ~ '^https://'),
  confidence text not null check (confidence in ('high', 'moderate', 'low', 'hypothesis')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified')),
  notes text,
  last_checked_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Contenidos de la biblioteca ─────────────────────────────────────────

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type text not null check (type in (
    'guide', 'age_stage', 'situation_card', 'when_to_consult', 'local_resource', 'glossary'
  )),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null check (char_length(summary) between 1 and 400),
  body_md text not null,
  age_min_months integer check (age_min_months between 0 and 216),
  age_max_months integer check (age_max_months between 0 and 216),
  evidence_label text not null check (evidence_label in (
    'recomendacion_oficial', 'evidencia_consolidada', 'asociacion_no_causa', 'hipotesis',
    'opinion_profesional', 'propuesta_proyecto'
  )),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  sort_order integer not null default 0,
  -- Revisión profesional: sin revisor, la interfaz lo muestra como "pendiente de revisión".
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at date,
  published_at timestamptz,
  search tsvector generated always as (
    to_tsvector('public.es_unaccent'::regconfig, title || ' ' || summary || ' ' || body_md)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min_months is null or age_max_months is null or age_min_months <= age_max_months),
  check (status <> 'published' or published_at is not null)
);

create index content_items_status_type_idx on public.content_items (status, type, sort_order);
create index content_items_reviewed_by_idx on public.content_items (reviewed_by);
create index content_items_search_idx on public.content_items using gin (search);

create table public.content_revisions (
  content_id uuid not null references public.content_items (id) on delete cascade,
  revision integer not null check (revision > 0),
  body_md text not null,
  edited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (content_id, revision)
);

create index content_revisions_edited_by_idx on public.content_revisions (edited_by);

create table public.content_sources (
  content_id uuid not null references public.content_items (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  locator text,
  primary key (content_id, source_id)
);

create index content_sources_source_idx on public.content_sources (source_id);

-- ── Actividades ─────────────────────────────────────────────────────────

create table public.activity_categories (
  code text primary key check (code ~ '^[a-z_]+$'),
  label text not null,
  sort_order integer not null default 0
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 400),
  objective text not null,
  age_min_months integer not null check (age_min_months between 0 and 216),
  age_max_months integer not null check (age_max_months between 0 and 216),
  duration_min integer not null check (duration_min between 1 and 240),
  participants_min integer not null default 1 check (participants_min >= 1),
  participants_max integer check (participants_max is null or participants_max >= participants_min),
  cost_level text not null check (cost_level in ('free', 'low', 'medium')),
  space text not null check (space in ('small_indoor', 'indoor', 'outdoor')),
  materials text[] not null default '{}',
  variants text[] not null default '{}',
  accessibility_notes text[] not null default '{}',
  safety_notes text,
  evidence_label text not null check (evidence_label in (
    'recomendacion_oficial', 'evidencia_consolidada', 'asociacion_no_causa', 'hipotesis',
    'opinion_profesional', 'propuesta_proyecto'
  )),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  sort_order integer not null default 0,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at date,
  published_at timestamptz,
  search tsvector generated always as (
    to_tsvector('public.es_unaccent'::regconfig, title || ' ' || summary || ' ' || objective)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min_months <= age_max_months),
  check (status <> 'published' or published_at is not null)
);

create index activities_filters_idx
  on public.activities (status, age_min_months, age_max_months, duration_min);
create index activities_reviewed_by_idx on public.activities (reviewed_by);
create index activities_search_idx on public.activities using gin (search);

create table public.activity_steps (
  activity_id uuid not null references public.activities (id) on delete cascade,
  position integer not null check (position > 0),
  body text not null check (char_length(body) between 1 and 500),
  primary key (activity_id, position)
);

create table public.activity_category_links (
  activity_id uuid not null references public.activities (id) on delete cascade,
  category_code text not null references public.activity_categories (code) on delete restrict,
  primary key (activity_id, category_code)
);

create index activity_category_links_category_idx on public.activity_category_links (category_code);

create table public.activity_sources (
  activity_id uuid not null references public.activities (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  locator text,
  primary key (activity_id, source_id)
);

create index activity_sources_source_idx on public.activity_sources (source_id);

-- ── Favoritos y actividades realizadas (datos de la familia) ────────────

create table public.saved_activities (
  family_id uuid not null references public.families (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  saved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (family_id, activity_id)
);

create index saved_activities_activity_idx on public.saved_activities (activity_id);
create index saved_activities_saved_by_idx on public.saved_activities (saved_by);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  logged_by uuid references public.profiles (id) on delete set null,
  done_on date not null default current_date,
  -- Valoración opcional (1 a 5). Sin texto libre: no se registran datos sobre los chicos.
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index activity_logs_family_idx on public.activity_logs (family_id, done_on desc);
create index activity_logs_activity_idx on public.activity_logs (activity_id);
create index activity_logs_logged_by_idx on public.activity_logs (logged_by);

create table public.activity_log_participants (
  log_id uuid not null references public.activity_logs (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  primary key (log_id, member_id)
);

create index activity_log_participants_member_idx on public.activity_log_participants (member_id);

-- ── Triggers ────────────────────────────────────────────────────────────

create trigger sources_set_updated_at before update on public.sources
  for each row execute function public.set_updated_at();
create trigger content_items_set_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();
create trigger activities_set_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

-- Un participante tiene que ser de la misma familia que el registro.
create function public.validate_log_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.activity_logs l
    join public.family_members m on m.family_id = l.family_id
    where l.id = new.log_id and m.id = new.member_id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'participant_from_other_family');
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_log_participant() from public, anon, authenticated;

create trigger activity_log_participants_validate
  before insert or update on public.activity_log_participants
  for each row execute function public.validate_log_participant();

-- ── Privilegios y políticas ─────────────────────────────────────────────

alter table public.sources enable row level security;
alter table public.content_items enable row level security;
alter table public.content_revisions enable row level security;
alter table public.content_sources enable row level security;
alter table public.activity_categories enable row level security;
alter table public.activities enable row level security;
alter table public.activity_steps enable row level security;
alter table public.activity_category_links enable row level security;
alter table public.activity_sources enable row level security;
alter table public.saved_activities enable row level security;
alter table public.activity_logs enable row level security;
alter table public.activity_log_participants enable row level security;

revoke all on public.sources, public.content_items, public.content_revisions,
  public.content_sources, public.activity_categories, public.activities, public.activity_steps,
  public.activity_category_links, public.activity_sources, public.saved_activities,
  public.activity_logs, public.activity_log_participants
  from anon, authenticated;

-- Catálogo público: solo lectura, y solo lo publicado. La escritura es del servidor
-- (sincronización de contenido) y, en la Fase 10, del panel de administración.
grant select on public.sources, public.content_items, public.content_sources,
  public.activity_categories, public.activities, public.activity_steps,
  public.activity_category_links, public.activity_sources
  to anon, authenticated;

create policy sources_select on public.sources
  for select to anon, authenticated using (true);
create policy content_items_select_published on public.content_items
  for select to anon, authenticated using (status = 'published');
create policy content_sources_select on public.content_sources
  for select to anon, authenticated
  using (exists (select 1 from public.content_items c where c.id = content_id and c.status = 'published'));
create policy activity_categories_select on public.activity_categories
  for select to anon, authenticated using (true);
create policy activities_select_published on public.activities
  for select to anon, authenticated using (status = 'published');
create policy activity_steps_select on public.activity_steps
  for select to anon, authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and a.status = 'published'));
create policy activity_category_links_select on public.activity_category_links
  for select to anon, authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and a.status = 'published'));
create policy activity_sources_select on public.activity_sources
  for select to anon, authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and a.status = 'published'));

-- Favoritos: los ve toda la familia; los gestionan owner y guardian (la caregiver solo ve).
grant select, delete on public.saved_activities to authenticated;
grant insert (family_id, activity_id, saved_by) on public.saved_activities to authenticated;

create policy saved_activities_select on public.saved_activities
  for select to authenticated using ((select public.is_family_adult(family_id)));
create policy saved_activities_insert on public.saved_activities
  for insert to authenticated
  with check (
    saved_by = (select auth.uid())
    and (select public.is_family_adult(family_id, array['owner', 'guardian']))
  );
create policy saved_activities_delete on public.saved_activities
  for delete to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));

-- Actividades realizadas: cualquier adulto de la familia (también la caregiver) las registra.
grant select, delete on public.activity_logs to authenticated;
grant insert (family_id, activity_id, logged_by, done_on, rating) on public.activity_logs to authenticated;
grant update (rating) on public.activity_logs to authenticated;

create policy activity_logs_select on public.activity_logs
  for select to authenticated using ((select public.is_family_adult(family_id)));
create policy activity_logs_insert on public.activity_logs
  for insert to authenticated
  with check (logged_by = (select auth.uid()) and (select public.is_family_adult(family_id)));
create policy activity_logs_update on public.activity_logs
  for update to authenticated
  using (logged_by = (select auth.uid()))
  with check (logged_by = (select auth.uid()));
create policy activity_logs_delete on public.activity_logs
  for delete to authenticated
  using (
    logged_by = (select auth.uid())
    or (select public.is_family_adult(family_id, array['owner', 'guardian']))
  );

grant select, insert, delete on public.activity_log_participants to authenticated;

create policy activity_log_participants_select on public.activity_log_participants
  for select to authenticated
  using (exists (
    select 1 from public.activity_logs l
    where l.id = log_id and (select public.is_family_adult(l.family_id))
  ));
create policy activity_log_participants_insert on public.activity_log_participants
  for insert to authenticated
  with check (exists (
    select 1 from public.activity_logs l
    where l.id = log_id and l.logged_by = (select auth.uid())
  ));
create policy activity_log_participants_delete on public.activity_log_participants
  for delete to authenticated
  using (exists (
    select 1 from public.activity_logs l
    where l.id = log_id
      and (l.logged_by = (select auth.uid())
           or (select public.is_family_adult(l.family_id, array['owner', 'guardian'])))
  ));

-- ── Datos de referencia ─────────────────────────────────────────────────

insert into public.activity_categories (code, label, sort_order) values
  ('movimiento', 'Movimiento', 1),
  ('creatividad', 'Creatividad', 2),
  ('lenguaje', 'Lenguaje y lectura', 3),
  ('calma', 'Calma y emociones', 4),
  ('juego_social', 'Juego con otros', 5),
  ('exploracion', 'Exploración y ciencia', 6),
  ('autonomia', 'Autonomía', 7),
  ('vinculo', 'Tiempo en familia', 8)
on conflict (code) do nothing;
