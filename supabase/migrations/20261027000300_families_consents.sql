-- 0003 · Familias, integrantes, invitaciones, preferencias y consentimientos
-- Ver DATABASE.md §3.1 y ROLES_AND_PERMISSIONS.md §3.

-- ── Tablas ──────────────────────────────────────────────────────────────

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  chat_history_enabled boolean not null default false,
  chat_retention_days integer not null default 30 check (chat_retention_days in (30, 90)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index families_created_by_idx on public.families (created_by);

create table public.family_memberships (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'guardian', 'caregiver')),
  relationship text not null
    check (relationship in ('madre', 'padre', 'tutor', 'tutora', 'abuela', 'abuelo', 'otro')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Consulta base de RLS: "¿a qué familias pertenece este usuario?"
create index family_memberships_user_idx on public.family_memberships (user_id);
create index family_memberships_invited_by_idx on public.family_memberships (invited_by);

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  -- Siempre en minúsculas: la comparación al aceptar es exacta.
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('owner', 'guardian', 'caregiver')),
  -- Se guarda solo el hash SHA-256 del token; el token viaja únicamente en el correo.
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '14 days'),
  check (accepted_at is null or revoked_at is null)
);

create index family_invitations_family_idx on public.family_invitations (family_id);
create index family_invitations_invited_by_idx on public.family_invitations (invited_by);
create index family_invitations_accepted_by_idx on public.family_invitations (accepted_by);
create unique index family_invitations_one_open_per_email
  on public.family_invitations (family_id, email)
  where accepted_at is null and revoked_at is null;

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  -- Minimización: apodo y mes/año de nacimiento; nunca nombre real, DNI, escuela ni fotos.
  alias text not null check (char_length(btrim(alias)) between 1 and 40),
  birth_month date not null
    check (birth_month = date_trunc('month', birth_month)::date and birth_month >= date '1990-01-01'),
  interests text[] not null default '{}' check (cardinality(interests) <= 10),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_members_family_idx on public.family_members (family_id);

create table public.family_preferences (
  family_id uuid primary key references public.families (id) on delete cascade,
  minutes_per_day integer check (minutes_per_day between 0 and 600),
  space text check (space in ('small_indoor', 'indoor', 'outdoor')),
  budget text check (budget in ('free', 'low', 'medium')),
  interests text[] not null default '{}' check (cardinality(interests) <= 15),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in (
    'terms_privacy', 'chat_history', 'child_data', 'ai_personal_context', 'professional_access'
  )),
  family_id uuid references public.families (id) on delete cascade,
  member_id uuid references public.family_members (id) on delete cascade,
  granted_by uuid not null references public.profiles (id) on delete cascade,
  policy_version text not null check (policy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  check (revoked_at is null or revoked_by is not null),
  -- Forma del sujeto según la finalidad (SECURITY_AND_PRIVACY.md §3.4).
  check (
    (purpose in ('terms_privacy', 'chat_history') and family_id is null and member_id is null)
    or (purpose = 'ai_personal_context' and family_id is not null and member_id is null)
    or (purpose = 'child_data' and family_id is not null and member_id is not null)
    or (purpose = 'professional_access' and family_id is not null)
  )
);

create index consents_family_idx on public.consents (family_id);
create index consents_member_idx on public.consents (member_id);
create index consents_granted_by_idx on public.consents (granted_by);
create index consents_revoked_by_idx on public.consents (revoked_by);
-- Un consentimiento activo por finalidad y sujeto (professional_access admite varios: uno por permiso).
create unique index consents_one_active_user_level
  on public.consents (granted_by, purpose)
  where family_id is null and revoked_at is null;
create unique index consents_one_active_family_level
  on public.consents (family_id, member_id, purpose) nulls not distinct
  where family_id is not null and revoked_at is null and purpose <> 'professional_access';

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();
create trigger family_members_set_updated_at
  before update on public.family_members
  for each row execute function public.set_updated_at();
create trigger family_preferences_set_updated_at
  before update on public.family_preferences
  for each row execute function public.set_updated_at();

-- ── Helpers de autorización (usados por las políticas) ──────────────────

-- ¿El usuario actual es adulto de la familia (con alguno de los roles indicados)?
create function public.is_family_adult(p_family_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_memberships m
    where m.family_id = p_family_id
      and m.user_id = auth.uid()
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

-- ¿El usuario actual comparte alguna familia con otro usuario? (para ver nombres de co-adultos)
create function public.shares_family_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_memberships mine
    join public.family_memberships theirs on theirs.family_id = mine.family_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;

revoke execute on function public.is_family_adult(uuid, text[]) from public, anon;
revoke execute on function public.shares_family_with(uuid) from public, anon;
grant execute on function public.is_family_adult(uuid, text[]) to authenticated, service_role;
grant execute on function public.shares_family_with(uuid) to authenticated, service_role;

-- ── Privilegios y políticas ─────────────────────────────────────────────

alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.family_invitations enable row level security;
alter table public.family_members enable row level security;
alter table public.family_preferences enable row level security;
alter table public.consents enable row level security;

revoke all on public.families, public.family_memberships, public.family_invitations,
  public.family_members, public.family_preferences, public.consents
  from anon, authenticated;

-- Las altas de familias, integrantes y membresías van por RPC (atómicas y con consentimiento):
-- el cliente no tiene INSERT sobre esas tablas.
grant select, delete on public.families to authenticated;
grant update (name, chat_history_enabled, chat_retention_days) on public.families to authenticated;

grant select, delete on public.family_memberships to authenticated;
grant update (role, relationship) on public.family_memberships to authenticated;

grant select on public.family_invitations to authenticated;
grant insert (family_id, email, role, token_hash, invited_by, expires_at)
  on public.family_invitations to authenticated;
grant update (revoked_at) on public.family_invitations to authenticated;

grant select, delete on public.family_members to authenticated;
grant update (alias, birth_month, interests, archived_at) on public.family_members to authenticated;

grant select on public.family_preferences to authenticated;
grant update (minutes_per_day, space, budget, interests) on public.family_preferences to authenticated;

grant select on public.consents to authenticated;
grant insert (purpose, family_id, member_id, granted_by, policy_version) on public.consents to authenticated;
grant update (revoked_at, revoked_by) on public.consents to authenticated;

-- families
create policy families_select on public.families
  for select to authenticated using ((select public.is_family_adult(id)));
create policy families_update on public.families
  for update to authenticated
  using ((select public.is_family_adult(id, array['owner', 'guardian'])))
  with check ((select public.is_family_adult(id, array['owner', 'guardian'])));
create policy families_delete on public.families
  for delete to authenticated using ((select public.is_family_adult(id, array['owner'])));

-- family_memberships
create policy memberships_select on public.family_memberships
  for select to authenticated using ((select public.is_family_adult(family_id)));
create policy memberships_update on public.family_memberships
  for update to authenticated
  using ((select public.is_family_adult(family_id, array['owner'])))
  with check ((select public.is_family_adult(family_id, array['owner'])));
-- El owner puede quitar a cualquiera; cualquier adulto puede irse de la familia.
create policy memberships_delete on public.family_memberships
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_family_adult(family_id, array['owner'])));

-- family_invitations: owner invita cualquier rol; guardian solo caregivers.
create policy invitations_select on public.family_invitations
  for select to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));
create policy invitations_insert on public.family_invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and (
      (select public.is_family_adult(family_id, array['owner']))
      or (role = 'caregiver' and (select public.is_family_adult(family_id, array['guardian'])))
    )
  );
create policy invitations_revoke on public.family_invitations
  for update to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])) and accepted_at is null)
  with check ((select public.is_family_adult(family_id, array['owner', 'guardian'])));

-- family_members
create policy members_select on public.family_members
  for select to authenticated using ((select public.is_family_adult(family_id)));
create policy members_update on public.family_members
  for update to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])))
  with check ((select public.is_family_adult(family_id, array['owner', 'guardian'])));
create policy members_delete on public.family_members
  for delete to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));

-- family_preferences
create policy preferences_select on public.family_preferences
  for select to authenticated using ((select public.is_family_adult(family_id)));
create policy preferences_update on public.family_preferences
  for update to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])))
  with check ((select public.is_family_adult(family_id, array['owner', 'guardian'])));

-- consents
create policy consents_select on public.consents
  for select to authenticated
  using (
    (family_id is null and granted_by = (select auth.uid()))
    or (family_id is not null and (select public.is_family_adult(family_id, array['owner', 'guardian'])))
  );
-- child_data y professional_access se otorgan por RPC (junto con el alta del integrante o del permiso).
create policy consents_insert on public.consents
  for insert to authenticated
  with check (
    granted_by = (select auth.uid())
    and (
      (family_id is null and purpose in ('terms_privacy', 'chat_history'))
      or (purpose = 'ai_personal_context'
          and (select public.is_family_adult(family_id, array['owner', 'guardian'])))
    )
  );
create policy consents_revoke on public.consents
  for update to authenticated
  using (
    revoked_at is null
    and (
      (family_id is null and granted_by = (select auth.uid()))
      or (family_id is not null and (select public.is_family_adult(family_id, array['owner', 'guardian'])))
    )
  )
  with check (revoked_by = (select auth.uid()) and revoked_at is not null);

-- Perfiles de co-adultos visibles (solo nombre y preferencias de interfaz).
create policy profiles_select_family on public.profiles
  for select to authenticated using ((select public.shares_family_with(id)));

-- La familia ve la auditoría de su familia (por ejemplo, accesos de profesionales).
create policy audit_log_select_family on public.audit_log
  for select to authenticated
  using (family_id is not null and (select public.is_family_adult(family_id, array['owner', 'guardian'])));

-- ── Reglas de integridad ────────────────────────────────────────────────

-- Toda familia conserva al menos un owner.
create function public.ensure_family_has_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.families where id = old.family_id)
     and not exists (
       select 1 from public.family_memberships
       where family_id = old.family_id and role = 'owner'
     ) then
    perform public.raise_domain_error('LAST_FAMILY_OWNER');
  end if;
  return null;
end;
$$;

create trigger family_memberships_keep_owner
  after update of role or delete on public.family_memberships
  for each row execute function public.ensure_family_has_owner();

create function public.validate_family_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_month > date_trunc('month', current_date)::date then
    perform public.raise_domain_error('BIRTH_MONTH_IN_FUTURE');
  end if;
  new.alias := btrim(new.alias);
  return new;
end;
$$;

create trigger family_members_validate
  before insert or update of birth_month, alias on public.family_members
  for each row execute function public.validate_family_member();

-- Consentimientos: solo se revocan, nunca se reactivan ni se reescriben.
create function public.validate_consent_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.revoked_at is not null then
    perform public.raise_domain_error('CONSENT_ALREADY_REVOKED');
  end if;
  return new;
end;
$$;

create trigger consents_validate_update
  before update on public.consents
  for each row execute function public.validate_consent_update();

-- Revocar child_data archiva al integrante: sus datos dejan de usarse.
create function public.archive_member_on_child_data_revoked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.purpose = 'child_data' and old.revoked_at is null and new.revoked_at is not null then
    update public.family_members
      set archived_at = coalesce(archived_at, now())
      where id = new.member_id;
  end if;
  return null;
end;
$$;

create trigger consents_child_data_revoked
  after update of revoked_at on public.consents
  for each row execute function public.archive_member_on_child_data_revoked();

-- ── Auditoría (un único lugar: triggers) ────────────────────────────────

create function public.audit_family_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_family uuid;
  v_action text;
  v_entity text;
  v_meta jsonb := '{}'::jsonb;
begin
  v_family := coalesce((v_row ->> 'family_id')::uuid,
                       case when tg_table_name = 'families' then (v_row ->> 'id')::uuid end);
  v_entity := case when tg_table_name = 'family_memberships' then v_row ->> 'user_id'
                   else v_row ->> 'id' end;

  case tg_table_name
    when 'families' then
      v_action := case tg_op when 'INSERT' then 'family.created' else 'family.deleted' end;
    when 'family_memberships' then
      v_action := case tg_op
        when 'INSERT' then 'family.adult_joined'
        when 'UPDATE' then 'family.role_changed'
        else 'family.adult_removed' end;
      v_meta := jsonb_build_object('role', v_row ->> 'role');
    when 'family_members' then
      v_action := case
        when tg_op = 'INSERT' then 'family.member_added'
        when tg_op = 'DELETE' then 'family.member_deleted'
        when new.archived_at is not null and old.archived_at is null then 'family.member_archived'
        else 'family.member_updated' end;
    when 'family_invitations' then
      v_action := case when tg_op = 'INSERT' then 'family.adult_invited'
                       else 'family.invitation_revoked' end;
      v_meta := jsonb_build_object('role', v_row ->> 'role');
    when 'consents' then
      v_action := case when tg_op = 'INSERT' then 'consent.granted' else 'consent.revoked' end;
      v_meta := jsonb_build_object('purpose', v_row ->> 'purpose',
                                   'policy_version', v_row ->> 'policy_version');
  end case;

  perform public.log_audit(v_action, tg_table_name, v_entity, v_family, v_meta);
  return null;
end;
$$;

create trigger families_audit
  after insert or delete on public.families
  for each row execute function public.audit_family_change();
create trigger family_memberships_audit
  after insert or update of role or delete on public.family_memberships
  for each row execute function public.audit_family_change();
create trigger family_members_audit
  after insert or update or delete on public.family_members
  for each row execute function public.audit_family_change();
create trigger family_invitations_audit
  after insert or update of revoked_at on public.family_invitations
  for each row execute function public.audit_family_change();
create trigger consents_audit
  after insert or update of revoked_at on public.consents
  for each row execute function public.audit_family_change();

-- ── RPC ─────────────────────────────────────────────────────────────────

-- Crea la familia con su owner y sus preferencias, en una transacción.
create function public.create_family(p_name text, p_relationship text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_family uuid;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;

  insert into public.families (name, created_by)
  values (btrim(p_name), v_user)
  returning id into v_family;

  insert into public.family_memberships (family_id, user_id, role, relationship, invited_by)
  values (v_family, v_user, 'owner', p_relationship, null);

  insert into public.family_preferences (family_id) values (v_family);

  return v_family;
end;
$$;

-- Alta de integrante: exige el consentimiento child_data y lo registra junto con el alta.
create function public.add_family_member(
  p_family_id uuid,
  p_alias text,
  p_birth_month date,
  p_interests text[],
  p_policy_version text,
  p_child_data_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_member uuid;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  if not public.is_family_adult(p_family_id, array['owner', 'guardian']) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  if p_child_data_consent is not true then
    perform public.raise_domain_error('CONSENT_REQUIRED', 'child_data');
  end if;

  insert into public.family_members (family_id, alias, birth_month, interests)
  values (p_family_id, p_alias, date_trunc('month', p_birth_month)::date, coalesce(p_interests, '{}'))
  returning id into v_member;

  insert into public.consents (purpose, family_id, member_id, granted_by, policy_version)
  values ('child_data', p_family_id, v_member, v_user, p_policy_version);

  return v_member;
end;
$$;

-- Acepta una invitación: el token se compara por hash y el correo tiene que coincidir.
create function public.accept_family_invitation(p_token text, p_relationship text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_inv public.family_invitations;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;

  select * into v_inv
  from public.family_invitations
  where token_hash = extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256')
  for update;

  if not found or v_inv.accepted_at is not null or v_inv.revoked_at is not null then
    perform public.raise_domain_error('INVITATION_INVALID');
  end if;
  if v_inv.expires_at <= now() then
    perform public.raise_domain_error('INVITATION_EXPIRED');
  end if;
  if v_email is null or v_inv.email <> lower(v_email) then
    perform public.raise_domain_error('INVITATION_EMAIL_MISMATCH');
  end if;
  if exists (select 1 from public.family_memberships
             where family_id = v_inv.family_id and user_id = v_user) then
    perform public.raise_domain_error('ALREADY_MEMBER');
  end if;

  insert into public.family_memberships (family_id, user_id, role, relationship, invited_by)
  values (v_inv.family_id, v_user, v_inv.role, p_relationship, v_inv.invited_by);

  update public.family_invitations
    set accepted_at = now(), accepted_by = v_user
    where id = v_inv.id;

  return v_inv.family_id;
end;
$$;

revoke execute on function public.create_family(text, text) from public, anon;
revoke execute on function public.add_family_member(uuid, text, date, text[], text, boolean) from public, anon;
revoke execute on function public.accept_family_invitation(text, text) from public, anon;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.add_family_member(uuid, text, date, text[], text, boolean) to authenticated;
grant execute on function public.accept_family_invitation(text, text) to authenticated;

revoke execute on function public.ensure_family_has_owner() from public, anon, authenticated;
revoke execute on function public.archive_member_on_child_data_revoked() from public, anon, authenticated;
revoke execute on function public.audit_family_change() from public, anon, authenticated;
