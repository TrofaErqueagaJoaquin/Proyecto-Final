-- 0002 · Identidad y acceso: perfiles, roles administrativos y permisos
-- Los roles globales son SOLO administrativos (ADR-007). "Familia" y "profesional" son contextuales.

-- ── Perfiles (1:1 con auth.users) ───────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  locale text not null default 'es-AR' check (locale in ('es-AR')),
  theme_pref text not null default 'system' check (theme_pref in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- El usuario solo puede cambiar estas columnas (nunca su id).
grant update (display_name, locale, theme_pref) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Crea el perfil al registrarse. Toma el nombre del proveedor (Google/GitHub) o del correo.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Persona usuaria'
  );
  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 80));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Roles y permisos administrativos ────────────────────────────────────

create table public.roles (
  code text primary key check (code ~ '^[a-z][a-z_]*$'),
  name text not null,
  description text not null
);

create table public.permissions (
  code text primary key check (code ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null
);

create table public.role_permissions (
  role_code text not null references public.roles (code) on delete cascade,
  permission_code text not null references public.permissions (code) on delete restrict,
  primary key (role_code, permission_code)
);

create index role_permissions_permission_idx on public.role_permissions (permission_code);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_code text not null references public.roles (code) on delete restrict,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_code)
);

create index user_roles_role_idx on public.user_roles (role_code);
create index user_roles_granted_by_idx on public.user_roles (granted_by);

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

revoke all on public.roles, public.permissions, public.role_permissions, public.user_roles
  from anon, authenticated;
-- Catálogos: lectura para cualquier sesión. Escritura: solo migraciones y seed.
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
-- user_roles: lectura con política. Escritura: SOLO la API con service_role, después de
-- verificar users.manage_roles y MFA (nunca el cliente, ni siquiera un administrador).
grant select on public.user_roles to authenticated;

create policy roles_select on public.roles for select to authenticated using (true);
create policy permissions_select on public.permissions for select to authenticated using (true);
create policy role_permissions_select on public.role_permissions
  for select to authenticated using (true);

-- ¿El usuario actual tiene este permiso administrativo?
create function public.has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_code = ur.role_code
    where ur.user_id = auth.uid()
      and rp.permission_code = p_code
  );
$$;

revoke execute on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated, service_role;

create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.read')));

-- No se puede quitar el último platform_admin.
create function public.ensure_platform_admin_remains()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role_code = 'platform_admin'
     and not exists (select 1 from public.user_roles where role_code = 'platform_admin')
     and exists (select 1 from public.profiles where id = old.user_id) then
    perform public.raise_domain_error('LAST_PLATFORM_ADMIN');
  end if;
  return null;
end;
$$;

revoke execute on function public.ensure_platform_admin_remains() from public, anon, authenticated;

create trigger user_roles_keep_platform_admin
  after delete on public.user_roles
  for each row execute function public.ensure_platform_admin_remains();

create function public.audit_user_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit('auth.role_granted', 'user', new.user_id::text, null,
      jsonb_build_object('role', new.role_code));
  else
    perform public.log_audit('auth.role_revoked', 'user', old.user_id::text, null,
      jsonb_build_object('role', old.role_code));
  end if;
  return null;
end;
$$;

revoke execute on function public.audit_user_roles() from public, anon, authenticated;

create trigger user_roles_audit
  after insert or delete on public.user_roles
  for each row execute function public.audit_user_roles();

-- Auditoría: quien tenga audit.read lee todo; cada persona, lo que hizo ella.
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using ((select public.has_permission('audit.read')) or actor_id = (select auth.uid()));
