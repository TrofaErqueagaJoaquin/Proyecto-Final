-- 0006 · Profesionales, credenciales, acompañamientos, permisos por alcance, observaciones y objetivos
-- Ver docs/planning/DATABASE.md §3.2 y ROLES_AND_PERMISSIONS.md §4–§6.
-- Los objetivos (follow_up_goals) se crean acá porque el profesional los propone (Fase 7 los amplía).

-- ── Catálogo de especialidades ──────────────────────────────────────────

create table public.specialties (
  code text primary key check (code ~ '^[a-z_]+$'),
  label text not null,
  position integer not null default 0
);

insert into public.specialties (code, label, position) values
  ('psicologia', 'Psicología', 1),
  ('psicopedagogia', 'Psicopedagogía', 2),
  ('pediatria', 'Pediatría', 3),
  ('fonoaudiologia', 'Fonoaudiología', 4),
  ('terapia_ocupacional', 'Terapia ocupacional', 5),
  ('psicomotricidad', 'Psicomotricidad', 6),
  ('estimulacion_temprana', 'Estimulación temprana', 7),
  ('psiquiatria_infantil', 'Psiquiatría infantojuvenil', 8),
  ('neurologia_infantil', 'Neurología infantil', 9),
  ('trabajo_social', 'Trabajo social', 10);

-- ── Perfil profesional ──────────────────────────────────────────────────

create table public.professional_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 3 and 80),
  bio text not null default '' check (char_length(bio) <= 1200),
  modalities text[] not null default '{}'
    check (modalities <@ array['presencial', 'virtual']::text[]),
  city text check (city is null or char_length(btrim(city)) between 2 and 80),
  province text check (province is null or char_length(btrim(province)) between 2 and 80),
  public_contact text check (public_contact is null or char_length(btrim(public_contact)) between 3 and 160),
  years_experience integer check (years_experience between 0 and 70),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected', 'expired')),
  verified_at timestamptz,
  is_listed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((verification_status = 'verified') = (verified_at is not null))
);

create index professional_profiles_directory_idx
  on public.professional_profiles (province, city)
  where verification_status = 'verified' and is_listed;

create table public.professional_specialties (
  professional_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  specialty_code text not null references public.specialties (code) on delete restrict,
  primary key (professional_id, specialty_code)
);

create index professional_specialties_code_idx on public.professional_specialties (specialty_code);

-- Credenciales DECLARADAS por el profesional. Solo la verificación (service_role) las da por buenas.
create table public.professional_credentials (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  kind text not null check (kind in ('license', 'degree', 'other')),
  profession text not null check (char_length(btrim(profession)) between 2 and 80),
  jurisdiction text check (jurisdiction is null or char_length(btrim(jurisdiction)) between 2 and 80),
  license_number text check (license_number is null or char_length(btrim(license_number)) between 1 and 40),
  issuer text check (issuer is null or char_length(btrim(issuer)) between 2 and 120),
  -- Ruta en el bucket privado `credentials`, siempre bajo la carpeta del profesional.
  document_path text check (document_path is null or document_path ~ '^[0-9a-f-]{36}/[^/]+$'),
  status text not null default 'declared'
    check (status in ('declared', 'submitted', 'verified', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (document_path is null or split_part(document_path, '/', 1) = professional_id::text)
);

create index professional_credentials_professional_idx on public.professional_credentials (professional_id);

-- Solo inserción: cada revisión queda registrada.
create table public.credential_verifications (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.professional_credentials (id) on delete cascade,
  verifier_id uuid references public.profiles (id) on delete set null,
  method text not null check (method in ('refeps', 'colegio', 'manual')),
  result text not null check (result in ('verified', 'rejected', 'needs_info')),
  evidence_note text check (evidence_note is null or char_length(evidence_note) <= 500),
  checked_at timestamptz not null default now(),
  valid_until date
);

create index credential_verifications_credential_idx on public.credential_verifications (credential_id);
create index credential_verifications_verifier_idx on public.credential_verifications (verifier_id);

-- ── Acompañamientos y permisos ──────────────────────────────────────────

create table public.care_assignments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'active', 'rejected', 'cancelled', 'ended')),
  requested_by uuid references public.profiles (id) on delete set null,
  request_message text check (request_message is null or char_length(request_message) <= 500),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references public.profiles (id) on delete set null,
  end_reason text check (end_reason is null or char_length(end_reason) <= 300),
  check (professional_id <> requested_by)
);

create index care_assignments_family_idx on public.care_assignments (family_id);
create index care_assignments_professional_idx on public.care_assignments (professional_id, status);
create index care_assignments_requested_by_idx on public.care_assignments (requested_by);
create index care_assignments_ended_by_idx on public.care_assignments (ended_by);
-- Una relación abierta por par profesional–familia.
create unique index care_assignments_one_open
  on public.care_assignments (professional_id, family_id)
  where status in ('requested', 'active');

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.care_assignments (id) on delete cascade,
  -- null = permiso a nivel familia.
  member_id uuid references public.family_members (id) on delete cascade,
  scope text not null check (scope in (
    'member_profile', 'assessments', 'goals', 'activities', 'observations',
    'family_goals', 'family_plans'
  )),
  consent_id uuid not null references public.consents (id) on delete restrict,
  created_at timestamptz not null default now(),
  -- Se activa cuando el profesional acepta.
  activated_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  check ((scope in ('family_goals', 'family_plans')) = (member_id is null))
);

create index access_grants_assignment_idx on public.access_grants (assignment_id);
create index access_grants_member_idx on public.access_grants (member_id);
create index access_grants_consent_idx on public.access_grants (consent_id);
create index access_grants_revoked_by_idx on public.access_grants (revoked_by);
create unique index access_grants_one_active
  on public.access_grants (assignment_id, member_id, scope) nulls not distinct
  where revoked_at is null;

create table public.professional_observations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.care_assignments (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  author_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private', 'shared_family')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index professional_observations_assignment_idx on public.professional_observations (assignment_id);
create index professional_observations_member_idx on public.professional_observations (member_id);
create index professional_observations_author_idx on public.professional_observations (author_id);

-- ── Objetivos de seguimiento ────────────────────────────────────────────

create table public.follow_up_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  -- null = objetivo de la familia en general.
  member_id uuid references public.family_members (id) on delete cascade,
  -- Propuesto dentro de un acompañamiento (null si lo crea la familia).
  assignment_id uuid references public.care_assignments (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text check (description is null or char_length(description) <= 600),
  source text not null check (source in ('family', 'professional', 'recommendation')),
  status text not null default 'active' check (status in ('active', 'achieved', 'paused', 'dropped')),
  target_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Solo los objetivos del profesional se atan a un acompañamiento.
  check (source = 'professional' or assignment_id is null)
);

create index follow_up_goals_family_idx on public.follow_up_goals (family_id, status);
create index follow_up_goals_member_idx on public.follow_up_goals (member_id);
create index follow_up_goals_assignment_idx on public.follow_up_goals (assignment_id);
create index follow_up_goals_created_by_idx on public.follow_up_goals (created_by);

create table public.goal_progress_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.follow_up_goals (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  note text not null check (char_length(btrim(note)) between 1 and 500),
  -- Avance opcional en porcentaje.
  progress integer check (progress between 0 and 100),
  recorded_at timestamptz not null default now()
);

create index goal_progress_entries_goal_idx on public.goal_progress_entries (goal_id, recorded_at desc);
create index goal_progress_entries_author_idx on public.goal_progress_entries (author_id);

create trigger professional_profiles_set_updated_at
  before update on public.professional_profiles
  for each row execute function public.set_updated_at();
create trigger professional_credentials_set_updated_at
  before update on public.professional_credentials
  for each row execute function public.set_updated_at();
create trigger professional_observations_set_updated_at
  before update on public.professional_observations
  for each row execute function public.set_updated_at();
create trigger follow_up_goals_set_updated_at
  before update on public.follow_up_goals
  for each row execute function public.set_updated_at();

-- ── Helpers de autorización ─────────────────────────────────────────────

-- ¿El usuario actual (profesional) tiene este alcance activo? member null = nivel familia.
create function public.pro_has_scope(p_family uuid, p_member uuid, p_scope text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_assignments a
    join public.access_grants g on g.assignment_id = a.id
    left join public.family_members m on m.id = g.member_id
    where a.professional_id = auth.uid()
      and a.family_id = p_family
      and a.status = 'active'
      and g.scope = p_scope
      and g.revoked_at is null
      and g.activated_at is not null
      and g.member_id is not distinct from p_member
      and m.archived_at is null
  );
$$;

-- ¿El profesional acompaña (o acompañó, o fue invitado por) una familia del usuario actual?
create function public.is_professional_of_my_family(p_professional uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_assignments a
    join public.family_memberships m on m.family_id = a.family_id
    where a.professional_id = p_professional
      and m.user_id = auth.uid()
      and m.role in ('owner', 'guardian')
  );
$$;

create function public.is_assignment_party(p_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_assignments a
    where a.id = p_assignment
      and (a.professional_id = auth.uid()
           or public.is_family_adult(a.family_id, array['owner', 'guardian']))
  );
$$;

revoke execute on function public.pro_has_scope(uuid, uuid, text) from public, anon;
revoke execute on function public.is_professional_of_my_family(uuid) from public, anon;
revoke execute on function public.is_assignment_party(uuid) from public, anon;
grant execute on function public.pro_has_scope(uuid, uuid, text) to authenticated;
grant execute on function public.is_professional_of_my_family(uuid) to authenticated;
grant execute on function public.is_assignment_party(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────

alter table public.specialties enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.professional_specialties enable row level security;
alter table public.professional_credentials enable row level security;
alter table public.credential_verifications enable row level security;
alter table public.care_assignments enable row level security;
alter table public.access_grants enable row level security;
alter table public.professional_observations enable row level security;
alter table public.follow_up_goals enable row level security;
alter table public.goal_progress_entries enable row level security;

revoke all on public.specialties, public.professional_profiles, public.professional_specialties,
  public.professional_credentials, public.credential_verifications, public.care_assignments,
  public.access_grants, public.professional_observations, public.follow_up_goals,
  public.goal_progress_entries
  from anon, authenticated;

-- Catálogo público.
grant select on public.specialties to anon, authenticated;
create policy specialties_select on public.specialties for select to anon, authenticated using (true);

-- Directorio: solo verificados y listados. Además, el propio perfil y los que acompañan a mi familia.
grant select on public.professional_profiles to anon, authenticated;
grant insert (user_id, display_name, bio, modalities, city, province, public_contact, years_experience, is_listed)
  on public.professional_profiles to authenticated;
grant update (display_name, bio, modalities, city, province, public_contact, years_experience, is_listed)
  on public.professional_profiles to authenticated;

create policy professional_profiles_directory on public.professional_profiles
  for select to anon, authenticated
  using (verification_status = 'verified' and is_listed);
create policy professional_profiles_select_own on public.professional_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_professional_of_my_family(user_id)));
create policy professional_profiles_insert_own on public.professional_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy professional_profiles_update_own on public.professional_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Las especialidades se ven donde se ve el perfil (la política del perfil se aplica en el EXISTS).
grant select on public.professional_specialties to anon, authenticated;
grant insert, delete on public.professional_specialties to authenticated;

create policy professional_specialties_select on public.professional_specialties
  for select to anon, authenticated
  using (exists (
    select 1 from public.professional_profiles p where p.user_id = professional_id
  ));
create policy professional_specialties_insert on public.professional_specialties
  for insert to authenticated with check (professional_id = (select auth.uid()));
create policy professional_specialties_delete on public.professional_specialties
  for delete to authenticated using (professional_id = (select auth.uid()));

-- Credenciales: solo el profesional. El estado lo cambia submit (trigger) o la verificación.
grant select, delete on public.professional_credentials to authenticated;
grant insert (professional_id, kind, profession, jurisdiction, license_number, issuer, document_path)
  on public.professional_credentials to authenticated;
grant update (kind, profession, jurisdiction, license_number, issuer, document_path, status)
  on public.professional_credentials to authenticated;

create policy professional_credentials_select on public.professional_credentials
  for select to authenticated using (professional_id = (select auth.uid()));
create policy professional_credentials_insert on public.professional_credentials
  for insert to authenticated with check (professional_id = (select auth.uid()));
create policy professional_credentials_update on public.professional_credentials
  for update to authenticated
  using (professional_id = (select auth.uid()))
  with check (professional_id = (select auth.uid()));
create policy professional_credentials_delete on public.professional_credentials
  for delete to authenticated
  using (professional_id = (select auth.uid()) and status in ('declared', 'rejected'));

grant select on public.credential_verifications to authenticated;
create policy credential_verifications_select on public.credential_verifications
  for select to authenticated
  using (exists (
    select 1 from public.professional_credentials c
    where c.id = credential_id and c.professional_id = (select auth.uid())
  ));

-- Acompañamientos y permisos: lectura para las partes; las escrituras van por RPC.
grant select on public.care_assignments, public.access_grants to authenticated;

create policy care_assignments_select on public.care_assignments
  for select to authenticated
  using (
    professional_id = (select auth.uid())
    or (select public.is_family_adult(family_id, array['owner', 'guardian']))
  );
create policy access_grants_select on public.access_grants
  for select to authenticated using ((select public.is_assignment_party(assignment_id)));

-- Observaciones: el autor siempre (también al terminar el acompañamiento: ROLES §4 regla 4);
-- la familia y otros profesionales con alcance, solo las compartidas.
grant select on public.professional_observations to authenticated;
grant insert (assignment_id, member_id, author_id, visibility, body)
  on public.professional_observations to authenticated;
grant update (visibility, body) on public.professional_observations to authenticated;

create policy professional_observations_select on public.professional_observations
  for select to authenticated
  using (
    author_id = (select auth.uid())
    or (visibility = 'shared_family' and exists (
      select 1 from public.care_assignments a
      where a.id = assignment_id
        and ((select public.is_family_adult(a.family_id, array['owner', 'guardian']))
             or (select public.pro_has_scope(a.family_id, member_id, 'observations')))
    ))
  );
create policy professional_observations_insert on public.professional_observations
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy professional_observations_update on public.professional_observations
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- Objetivos: la familia (la caregiver lee), y el profesional con `goals` o `family_goals`.
grant select, delete on public.follow_up_goals to authenticated;
grant insert (family_id, member_id, assignment_id, title, description, source, status, target_date, created_by)
  on public.follow_up_goals to authenticated;
grant update (title, description, status, target_date) on public.follow_up_goals to authenticated;

create function public.can_read_goal(p_family uuid, p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_family_adult(p_family)
    or (p_member is not null and public.pro_has_scope(p_family, p_member, 'goals'))
    or (p_member is null and public.pro_has_scope(p_family, null, 'family_goals'));
$$;

create function public.can_write_goal(p_family uuid, p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_family_adult(p_family, array['owner', 'guardian'])
    or (p_member is not null and public.pro_has_scope(p_family, p_member, 'goals'))
    or (p_member is null and public.pro_has_scope(p_family, null, 'family_goals'));
$$;

revoke execute on function public.can_read_goal(uuid, uuid) from public, anon;
revoke execute on function public.can_write_goal(uuid, uuid) from public, anon;
grant execute on function public.can_read_goal(uuid, uuid) to authenticated;
grant execute on function public.can_write_goal(uuid, uuid) to authenticated;

create policy follow_up_goals_select on public.follow_up_goals
  for select to authenticated using ((select public.can_read_goal(family_id, member_id)));
create policy follow_up_goals_insert on public.follow_up_goals
  for insert to authenticated
  with check (created_by = (select auth.uid()) and (select public.can_write_goal(family_id, member_id)));
create policy follow_up_goals_update on public.follow_up_goals
  for update to authenticated
  using ((select public.can_write_goal(family_id, member_id)))
  with check ((select public.can_write_goal(family_id, member_id)));
create policy follow_up_goals_delete on public.follow_up_goals
  for delete to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));

grant select on public.goal_progress_entries to authenticated;
grant insert (goal_id, author_id, note, progress) on public.goal_progress_entries to authenticated;

create policy goal_progress_entries_select on public.goal_progress_entries
  for select to authenticated
  using (exists (select 1 from public.follow_up_goals g where g.id = goal_id));
create policy goal_progress_entries_insert on public.goal_progress_entries
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.follow_up_goals g
      where g.id = goal_id and (select public.can_write_goal(g.family_id, g.member_id))
    )
  );

-- ── Reglas de integridad ────────────────────────────────────────────────

-- El estado de una credencial: el profesional solo puede enviarla a verificación.
-- Sin SECURITY DEFINER a propósito: current_user es quien escribe (verify_credential es DEFINER).
create function public.validate_credential_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'declared' then
      perform public.raise_domain_error('FORBIDDEN', 'credential status');
    end if;
    return new;
  end if;
  if new.status is distinct from old.status
     and not (old.status in ('declared', 'rejected') and new.status = 'submitted') then
    perform public.raise_domain_error('FORBIDDEN', 'credential status');
  end if;
  -- Cambiar los datos de una credencial ya revisada la vuelve a "declarada".
  if old.status in ('submitted', 'verified', 'expired')
     and (new.profession, new.jurisdiction, new.license_number, new.issuer, new.document_path, new.kind)
         is distinct from
         (old.profession, old.jurisdiction, old.license_number, old.issuer, old.document_path, old.kind) then
    new.status := 'declared';
  end if;
  return new;
end;
$$;

create trigger professional_credentials_validate
  before insert or update on public.professional_credentials
  for each row execute function public.validate_credential_change();

-- Enviar una credencial deja el perfil "en revisión" y queda en la auditoría.
create function public.on_credential_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    update public.professional_profiles
      set verification_status = 'pending'
      where user_id = new.professional_id and verification_status in ('unverified', 'rejected');
    perform public.log_audit('credential.submitted', 'professional_credential', new.id::text, null,
      jsonb_build_object('kind', new.kind));
  end if;
  return null;
end;
$$;

create trigger professional_credentials_submitted
  after update of status on public.professional_credentials
  for each row execute function public.on_credential_submitted();

-- Un permiso solo puede ser sobre un integrante de la familia del acompañamiento.
create function public.validate_access_grant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_id is not null and not exists (
    select 1
    from public.care_assignments a
    join public.family_members m on m.family_id = a.family_id
    where a.id = new.assignment_id and m.id = new.member_id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'member of another family');
  end if;
  return new;
end;
$$;

create trigger access_grants_validate
  before insert or update of member_id, assignment_id on public.access_grants
  for each row execute function public.validate_access_grant();

-- Revocar el consentimiento de un permiso revoca el permiso (y viceversa lo hace la RPC).
create function public.revoke_grants_on_consent_revoked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.purpose = 'professional_access' and old.revoked_at is null and new.revoked_at is not null then
    update public.access_grants
      set revoked_at = new.revoked_at, revoked_by = new.revoked_by
      where consent_id = new.id and revoked_at is null;
  end if;
  return null;
end;
$$;

create trigger consents_professional_access_revoked
  after update of revoked_at on public.consents
  for each row execute function public.revoke_grants_on_consent_revoked();

-- Observaciones: solo con el alcance `observations` activo sobre ese integrante y en su acompañamiento.
create function public.validate_observation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_family uuid;
begin
  select a.family_id into v_family
  from public.care_assignments a
  where a.id = new.assignment_id and a.professional_id = new.author_id;
  if v_family is null or not public.pro_has_scope(v_family, new.member_id, 'observations') then
    perform public.raise_domain_error('FORBIDDEN', 'observations scope');
  end if;
  if tg_op = 'UPDATE' and (new.assignment_id, new.member_id, new.author_id)
       is distinct from (old.assignment_id, old.member_id, old.author_id) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  return new;
end;
$$;

create trigger professional_observations_validate
  before insert or update on public.professional_observations
  for each row execute function public.validate_observation();

-- Objetivos: el integrante es de la familia; los del profesional, dentro de su acompañamiento activo.
-- DEFINER: el profesional no lee family_members, pero el chequeo lo necesita.
create function public.validate_goal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.member_id is not null and not exists (
    select 1 from public.family_members m where m.id = new.member_id and m.family_id = new.family_id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'member of another family');
  end if;
  if tg_op = 'INSERT' then
    if new.source = 'professional' and new.assignment_id is null then
      perform public.raise_domain_error('FORBIDDEN', 'assignment');
    end if;
    if new.assignment_id is not null and not exists (
      select 1 from public.care_assignments a
      where a.id = new.assignment_id and a.family_id = new.family_id
        and a.professional_id = auth.uid() and a.status = 'active'
    ) then
      perform public.raise_domain_error('FORBIDDEN', 'assignment');
    end if;
    -- Quien no es adulto de la familia (el profesional) solo crea objetivos "del profesional".
    if not public.is_family_adult(new.family_id) and new.source <> 'professional' then
      perform public.raise_domain_error('FORBIDDEN', 'goal source');
    end if;
  elsif (new.family_id, new.member_id, new.assignment_id, new.source)
        is distinct from (old.family_id, old.member_id, old.assignment_id, old.source) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  return new;
end;
$$;

create trigger follow_up_goals_validate
  before insert or update on public.follow_up_goals
  for each row execute function public.validate_goal();

-- Auditoría de observaciones (sin el texto).
create function public.audit_observation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid;
begin
  select family_id into v_family from public.care_assignments where id = new.assignment_id;
  perform public.log_audit(
    case when tg_op = 'INSERT' then 'pro.observation.created' else 'pro.observation.updated' end,
    'professional_observation', new.id::text, v_family,
    jsonb_build_object('member_id', new.member_id, 'visibility', new.visibility));
  return null;
end;
$$;

create trigger professional_observations_audit
  after insert or update on public.professional_observations
  for each row execute function public.audit_observation();

-- ── RPC del ciclo de vida (ROLES_AND_PERMISSIONS.md §4.1) ───────────────

-- La familia pide acompañamiento. p_grants: [{"member_id": uuid|null, "scopes": [text]}].
create function public.request_care(
  p_family_id uuid,
  p_professional_id uuid,
  p_message text,
  p_grants jsonb,
  p_policy_version text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_assignment uuid;
  v_grant jsonb;
  v_member uuid;
  v_scope text;
  v_scopes text[];
  v_consent uuid;
  v_count integer := 0;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  if not public.is_family_adult(p_family_id, array['owner', 'guardian']) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  if p_professional_id = v_user
     or not exists (select 1 from public.professional_profiles where user_id = p_professional_id) then
    perform public.raise_domain_error('PROFESSIONAL_UNAVAILABLE');
  end if;
  if jsonb_typeof(p_grants) is distinct from 'array' or jsonb_array_length(p_grants) = 0 then
    perform public.raise_domain_error('CARE_SCOPE_REQUIRED');
  end if;

  begin
    insert into public.care_assignments (family_id, professional_id, requested_by, request_message)
    values (p_family_id, p_professional_id, v_user, nullif(btrim(p_message), ''))
    returning id into v_assignment;
  exception when unique_violation then
    perform public.raise_domain_error('CARE_ALREADY_OPEN');
  end;

  for v_grant in select * from jsonb_array_elements(p_grants) loop
    v_member := nullif(v_grant ->> 'member_id', '')::uuid;
    select coalesce(array_agg(distinct s), '{}') into v_scopes
    from jsonb_array_elements_text(coalesce(v_grant -> 'scopes', '[]'::jsonb)) as s;
    if cardinality(v_scopes) = 0 then
      continue;
    end if;

    if v_member is null then
      if not v_scopes <@ array['family_goals', 'family_plans'] then
        perform public.raise_domain_error('CARE_SCOPE_INVALID');
      end if;
    else
      if not exists (
        select 1 from public.family_members m
        where m.id = v_member and m.family_id = p_family_id and m.archived_at is null
      ) then
        perform public.raise_domain_error('FORBIDDEN', 'member');
      end if;
      if not v_scopes <@ array['member_profile', 'assessments', 'goals', 'activities', 'observations'] then
        perform public.raise_domain_error('CARE_SCOPE_INVALID');
      end if;
      -- member_profile es requisito de cualquier otro alcance sobre el integrante (ROLES §4 regla 2).
      if not 'member_profile' = any (v_scopes) then
        perform public.raise_domain_error('CARE_SCOPE_INVALID', 'member_profile required');
      end if;
    end if;

    foreach v_scope in array v_scopes loop
      insert into public.consents (purpose, family_id, member_id, granted_by, policy_version)
      values ('professional_access', p_family_id, v_member, v_user, p_policy_version)
      returning id into v_consent;
      insert into public.access_grants (assignment_id, member_id, scope, consent_id)
      values (v_assignment, v_member, v_scope, v_consent);
      v_count := v_count + 1;
    end loop;
  end loop;

  if v_count = 0 then
    perform public.raise_domain_error('CARE_SCOPE_REQUIRED');
  end if;

  perform public.log_audit('care.requested', 'care_assignment', v_assignment::text, p_family_id,
    jsonb_build_object('professional_id', p_professional_id, 'grants', v_count));
  return v_assignment;
end;
$$;

-- Revoca todos los permisos abiertos de un acompañamiento (y sus consentimientos).
create function public.revoke_assignment_grants(p_assignment uuid, p_by uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  with revoked as (
    update public.access_grants
      set revoked_at = now(), revoked_by = p_by
      where assignment_id = p_assignment and revoked_at is null
      returning consent_id
  )
  update public.consents c
    set revoked_at = now(), revoked_by = p_by
    from revoked r
    where c.id = r.consent_id and c.revoked_at is null;
$$;

revoke execute on function public.revoke_assignment_grants(uuid, uuid) from public, anon, authenticated;

-- El profesional acepta o rechaza una solicitud.
create function public.respond_care_request(p_assignment uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.care_assignments;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  select * into v_row from public.care_assignments where id = p_assignment for update;
  if v_row.id is null or v_row.professional_id <> v_user then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  if v_row.status <> 'requested' then
    perform public.raise_domain_error('CARE_NOT_PENDING');
  end if;

  if p_accept then
    update public.care_assignments set status = 'active', responded_at = now() where id = p_assignment;
    update public.access_grants set activated_at = now()
      where assignment_id = p_assignment and revoked_at is null;
  else
    update public.care_assignments set status = 'rejected', responded_at = now() where id = p_assignment;
    perform public.revoke_assignment_grants(p_assignment, v_user);
  end if;

  perform public.log_audit(case when p_accept then 'care.accepted' else 'care.rejected' end,
    'care_assignment', p_assignment::text, v_row.family_id, '{}'::jsonb);
end;
$$;

-- Termina un acompañamiento: la familia cancela una solicitud o cualquiera de las partes finaliza.
create function public.end_care(p_assignment uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.care_assignments;
  v_is_family boolean;
  v_status text;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  select * into v_row from public.care_assignments where id = p_assignment for update;
  if v_row.id is null then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  v_is_family := public.is_family_adult(v_row.family_id, array['owner', 'guardian']);
  if not v_is_family and v_row.professional_id <> v_user then
    perform public.raise_domain_error('NOT_FOUND');
  end if;

  if v_row.status = 'requested' and v_is_family then
    v_status := 'cancelled';
  elsif v_row.status = 'active' then
    v_status := 'ended';
  else
    perform public.raise_domain_error('CARE_NOT_OPEN');
  end if;

  update public.care_assignments
    set status = v_status, ended_at = now(), ended_by = v_user,
        end_reason = nullif(btrim(p_reason), '')
    where id = p_assignment;
  perform public.revoke_assignment_grants(p_assignment, v_user);
  perform public.log_audit(case when v_status = 'cancelled' then 'care.cancelled' else 'care.ended' end,
    'care_assignment', p_assignment::text, v_row.family_id,
    jsonb_build_object('by', case when v_is_family then 'family' else 'professional' end));
end;
$$;

-- La familia revoca un permiso. Revocar el perfil de un integrante revoca todo lo de ese integrante.
create function public.revoke_access_grant(p_grant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_grant public.access_grants;
  v_family uuid;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  select g.* into v_grant from public.access_grants g where g.id = p_grant;
  select a.family_id into v_family from public.care_assignments a where a.id = v_grant.assignment_id;
  if v_grant.id is null or not public.is_family_adult(v_family, array['owner', 'guardian']) then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  if v_grant.revoked_at is not null then
    return;
  end if;

  with revoked as (
    update public.access_grants g
      set revoked_at = now(), revoked_by = v_user
      where g.revoked_at is null
        and (g.id = p_grant
             or (v_grant.scope = 'member_profile'
                 and g.assignment_id = v_grant.assignment_id
                 and g.member_id = v_grant.member_id))
      returning g.consent_id
  )
  update public.consents c
    set revoked_at = now(), revoked_by = v_user
    from revoked r
    where c.id = r.consent_id and c.revoked_at is null;

  perform public.log_audit('grant.revoked', 'access_grant', p_grant::text, v_family,
    jsonb_build_object('scope', v_grant.scope, 'member_id', v_grant.member_id));
end;
$$;

-- Casos y solicitudes del profesional, con lo mínimo de la familia (ROLES §4 regla 3).
create function public.pro_cases()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(c order by c ->> 'created_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'family_name', f.name,
      'requested_by_name', p.display_name,
      'request_message', a.request_message,
      'created_at', a.created_at,
      'responded_at', a.responded_at,
      'ended_at', a.ended_at,
      'family_scopes', coalesce((
        select jsonb_agg(g.scope order by g.scope)
        from public.access_grants g
        where g.assignment_id = a.id and g.member_id is null and g.revoked_at is null
      ), '[]'::jsonb),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'alias', m.alias,
          'age_months', public.age_in_months(m.birth_month, current_date),
          'scopes', (select jsonb_agg(g2.scope order by g2.scope)
                     from public.access_grants g2
                     where g2.assignment_id = a.id and g2.member_id = m.id and g2.revoked_at is null)
        ) order by m.alias)
        from public.family_members m
        where m.archived_at is null and exists (
          select 1 from public.access_grants g
          where g.assignment_id = a.id and g.member_id = m.id and g.revoked_at is null
        )
      ), '[]'::jsonb)
    ) as c
    from public.care_assignments a
    join public.families f on f.id = a.family_id
    left join public.profiles p on p.id = a.requested_by
    where a.professional_id = auth.uid()
  ) cases;
$$;

-- Lectura auditada del resumen de un integrante: solo las secciones autorizadas (ROLES §6).
create function public.pro_member_overview(p_assignment uuid, p_member uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_family uuid;
  v_scopes text[];
  v_member public.family_members;
  v_result jsonb;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  select a.family_id into v_family
  from public.care_assignments a
  where a.id = p_assignment and a.professional_id = v_user and a.status = 'active';
  select coalesce(array_agg(g.scope), '{}') into v_scopes
  from public.access_grants g
  where g.assignment_id = p_assignment and g.member_id = p_member
    and g.revoked_at is null and g.activated_at is not null;
  select * into v_member from public.family_members
  where id = p_member and family_id = v_family and archived_at is null;
  -- Sin acompañamiento activo o sin member_profile: no existe para el profesional.
  if v_family is null or v_member.id is null or not 'member_profile' = any (v_scopes) then
    perform public.raise_domain_error('NOT_FOUND');
  end if;

  v_result := jsonb_build_object(
    'member', jsonb_build_object(
      'id', v_member.id,
      'alias', v_member.alias,
      'age_months', public.age_in_months(v_member.birth_month, current_date),
      'interests', to_jsonb(v_member.interests)
    ),
    'scopes', to_jsonb(v_scopes)
  );

  if 'assessments' = any (v_scopes) then
    v_result := v_result || jsonb_build_object('assessments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'submitted_at', t.submitted_at,
        'member_age_months', t.member_age_months,
        'dimensions', (
          select jsonb_agg(jsonb_build_object(
            'code', d.dimension_code, 'band', d.band, 'normalized', d.normalized
          ) order by d.dimension_code)
          from public.assessment_dimension_scores d where d.attempt_id = t.id
        )
      ) order by t.submitted_at desc)
      from public.assessment_attempts t
      where t.member_id = p_member and t.status = 'submitted'
    ), '[]'::jsonb));
  end if;

  if 'goals' = any (v_scopes) then
    v_result := v_result || jsonb_build_object('goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'title', g.title, 'description', g.description, 'status', g.status,
        'source', g.source, 'target_date', g.target_date, 'created_at', g.created_at,
        'progress', (
          select jsonb_agg(jsonb_build_object(
            'note', e.note, 'progress', e.progress, 'recorded_at', e.recorded_at
          ) order by e.recorded_at desc)
          from public.goal_progress_entries e where e.goal_id = g.id
        )
      ) order by g.created_at desc)
      from public.follow_up_goals g
      where g.member_id = p_member
    ), '[]'::jsonb));
  end if;

  if 'activities' = any (v_scopes) then
    v_result := v_result || jsonb_build_object('activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', act.title, 'done_on', l.done_on, 'rating', l.rating
      ) order by l.done_on desc)
      from public.activity_logs l
      join public.activity_log_participants lp on lp.log_id = l.id and lp.member_id = p_member
      join public.activities act on act.id = l.activity_id
    ), '[]'::jsonb));
  end if;

  if 'observations' = any (v_scopes) then
    v_result := v_result || jsonb_build_object('observations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'body', o.body, 'visibility', o.visibility,
        'mine', o.author_id = v_user,
        'author_name', pp.display_name,
        'created_at', o.created_at, 'updated_at', o.updated_at
      ) order by o.created_at desc)
      from public.professional_observations o
      join public.professional_profiles pp on pp.user_id = o.author_id
      where o.member_id = p_member and (o.author_id = v_user or o.visibility = 'shared_family')
    ), '[]'::jsonb));
  end if;

  perform public.log_audit('pro.read.member_overview', 'family_member', p_member::text, v_family,
    jsonb_build_object('assignment_id', p_assignment, 'scopes', to_jsonb(v_scopes)));
  return v_result;
end;
$$;

-- Verificación de una credencial (la llama la API o un script con service_role).
create function public.verify_credential(
  p_credential uuid,
  p_verifier uuid,
  p_method text,
  p_result text,
  p_note text default null,
  p_valid_until date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional uuid;
begin
  select professional_id into v_professional
  from public.professional_credentials where id = p_credential for update;
  if v_professional is null then
    perform public.raise_domain_error('NOT_FOUND');
  end if;

  insert into public.credential_verifications (credential_id, verifier_id, method, result, evidence_note, valid_until)
  values (p_credential, p_verifier, p_method, p_result, p_note, p_valid_until);

  if p_result in ('verified', 'rejected') then
    update public.professional_credentials set status = p_result where id = p_credential;
  end if;

  if p_result = 'verified' then
    update public.professional_profiles
      set verification_status = 'verified', verified_at = coalesce(verified_at, now())
      where user_id = v_professional;
  elsif p_result = 'rejected' and not exists (
    select 1 from public.professional_credentials
    where professional_id = v_professional and status = 'verified'
  ) then
    update public.professional_profiles
      set verification_status = 'rejected', verified_at = null
      where user_id = v_professional;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_verifier,
          case p_result when 'verified' then 'credential.verified'
                        when 'rejected' then 'credential.rejected'
                        else 'credential.needs_info' end,
          'professional_credential', p_credential::text,
          jsonb_build_object('method', p_method, 'professional_id', v_professional));
end;
$$;

revoke execute on function public.request_care(uuid, uuid, text, jsonb, text) from public, anon;
revoke execute on function public.respond_care_request(uuid, boolean) from public, anon;
revoke execute on function public.end_care(uuid, text) from public, anon;
revoke execute on function public.revoke_access_grant(uuid) from public, anon;
revoke execute on function public.pro_cases() from public, anon;
revoke execute on function public.pro_member_overview(uuid, uuid) from public, anon;
revoke execute on function public.verify_credential(uuid, uuid, text, text, text, date)
  from public, anon, authenticated;
grant execute on function public.request_care(uuid, uuid, text, jsonb, text) to authenticated;
grant execute on function public.respond_care_request(uuid, boolean) to authenticated;
grant execute on function public.end_care(uuid, text) to authenticated;
grant execute on function public.revoke_access_grant(uuid) to authenticated;
grant execute on function public.pro_cases() to authenticated;
grant execute on function public.pro_member_overview(uuid, uuid) to authenticated;
grant execute on function public.verify_credential(uuid, uuid, text, text, text, date) to service_role;

-- Los profesionales ven su propia auditoría (ROLES §5).
create policy audit_log_select_own on public.audit_log
  for select to authenticated using (actor_id = (select auth.uid()));

-- ── Storage: archivos de credenciales (bucket privado) ──────────────────
-- Solo en Supabase (el arnés local no tiene el esquema storage).
do $storage$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('credentials', 'credentials', false, 5242880,
            array['application/pdf', 'image/jpeg', 'image/png'])
    on conflict (id) do nothing;

    execute $p$
      create policy credentials_own_select on storage.objects
        for select to authenticated
        using (bucket_id = 'credentials' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy credentials_own_insert on storage.objects
        for insert to authenticated
        with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy credentials_own_delete on storage.objects
        for delete to authenticated
        using (bucket_id = 'credentials' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
  end if;
end;
$storage$;
