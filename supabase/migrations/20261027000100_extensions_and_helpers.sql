-- 0001 · Extensiones, utilidades comunes y auditoría
-- Ver docs/planning/DATABASE.md §7 y ROLES_AND_PERMISSIONS.md §8.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Búsqueda de texto en español que ignora tildes ("reacción" = "reaccion").
create text search configuration public.es_unaccent (copy = pg_catalog.spanish);
alter text search configuration public.es_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, spanish_stem;

-- ── Utilidades ──────────────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Error de dominio con un código estable que la API y la app traducen (packages/shared).
create function public.raise_domain_error(p_code text, p_detail text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- RAISE no admite opciones nulas: sin detalle se usa una cadena vacía.
  raise exception using errcode = 'P0001', message = p_code, detail = coalesce(p_detail, '');
end;
$$;

-- ── Auditoría (solo inserción) ──────────────────────────────────────────

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- Sin FK: la auditoría sobrevive al borrado del actor o de la familia.
  actor_id uuid,
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  entity_type text not null,
  entity_id text,
  family_id uuid,
  -- Nunca contenido sensible (textos de mensajes, observaciones, respuestas).
  metadata jsonb not null default '{}'::jsonb
);

create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);
create index audit_log_family_idx on public.audit_log (family_id, occurred_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
-- Las políticas de lectura se crean en 0002 y 0003, cuando existen roles y familias.

create function public.prevent_audit_log_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'AUDIT_LOG_IMMUTABLE';
end;
$$;

create trigger audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.prevent_audit_log_changes();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.prevent_audit_log_changes();

-- Único punto de escritura de la auditoría. La usan triggers y RPC (SECURITY DEFINER).
create function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_family_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, family_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_family_id, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke execute on function public.log_audit(text, text, text, uuid, jsonb) from public, anon, authenticated;
-- raise_domain_error solo lanza una excepción: puede ejecutarla cualquier sesión (la usan triggers
-- que corren con los privilegios del usuario).
revoke execute on function public.raise_domain_error(text, text) from public, anon;
grant execute on function public.raise_domain_error(text, text) to authenticated, service_role;
