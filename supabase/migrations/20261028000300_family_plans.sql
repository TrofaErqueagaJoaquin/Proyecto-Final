-- 0011 · Planes semanales de la familia (IMPLEMENTATION_PLAN.md F7). El plan lo arma el
-- generador por reglas (packages/domain/src/plans) en la API y se guarda con save_week_plan().
-- Cualquier adulto de la familia (también la caregiver) lo ve y marca lo que hicieron.

create table public.family_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  -- null = plan de la familia en general.
  member_id uuid references public.family_members (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  generator_version text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index family_plans_family_idx on public.family_plans (family_id, week_start desc);
create index family_plans_member_idx on public.family_plans (member_id);
create index family_plans_created_by_idx on public.family_plans (created_by);
-- Un plan por semana, para la familia o para cada integrante.
create unique index family_plans_one_per_week
  on public.family_plans (family_id, member_id, week_start) nulls not distinct;

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.family_plans (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  scheduled_for date not null,
  slot smallint not null default 0 check (slot between 0 and 2),
  reason text not null check (reason in ('recommended', 'interest', 'variety', 'quick', 'manual')),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  log_id uuid references public.activity_logs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, scheduled_for, slot),
  check (status <> 'done' or log_id is not null)
);

create index plan_items_plan_idx on public.plan_items (plan_id, scheduled_for);
create index plan_items_activity_idx on public.plan_items (activity_id);
create index plan_items_log_idx on public.plan_items (log_id);

create trigger plan_items_set_updated_at
  before update on public.plan_items
  for each row execute function public.set_updated_at();

-- El ítem cae dentro de su semana; la caregiver solo puede marcarlo (no cambiar la actividad).
create function public.validate_plan_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.family_plans;
begin
  select * into v_plan from public.family_plans where id = new.plan_id;
  if new.scheduled_for not between v_plan.week_start and v_plan.week_start + 6 then
    perform public.raise_domain_error('PLAN_OUTSIDE_WEEK');
  end if;
  if tg_op = 'UPDATE'
     and (new.activity_id, new.scheduled_for, new.slot, new.plan_id)
         is distinct from (old.activity_id, old.scheduled_for, old.slot, old.plan_id)
     and auth.uid() is not null
     and not public.is_family_adult(v_plan.family_id, array['owner', 'guardian']) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  return new;
end;
$$;

create trigger plan_items_validate
  before insert or update on public.plan_items
  for each row execute function public.validate_plan_item();

create function public.validate_family_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_id is not null and not exists (
    select 1 from public.family_members m where m.id = new.member_id and m.family_id = new.family_id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'member of another family');
  end if;
  return new;
end;
$$;

create trigger family_plans_validate
  before insert or update on public.family_plans
  for each row execute function public.validate_family_plan();

alter table public.family_plans enable row level security;
alter table public.plan_items enable row level security;
revoke all on public.family_plans, public.plan_items from anon, authenticated;

grant select, delete on public.family_plans to authenticated;
grant select on public.plan_items to authenticated;
grant update (activity_id, status, reason) on public.plan_items to authenticated;

create function public.plan_family(p_plan uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.family_plans where id = p_plan;
$$;

revoke execute on function public.plan_family(uuid) from public, anon;
grant execute on function public.plan_family(uuid) to authenticated;

create policy family_plans_select on public.family_plans
  for select to authenticated using ((select public.is_family_adult(family_id)));
create policy family_plans_delete on public.family_plans
  for delete to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])));

create policy plan_items_select on public.plan_items
  for select to authenticated using ((select public.is_family_adult(public.plan_family(plan_id))));
-- Cambiar la actividad ("otra idea") u omitirla: el trigger limita a la caregiver.
create policy plan_items_update on public.plan_items
  for update to authenticated
  using ((select public.is_family_adult(public.plan_family(plan_id))))
  with check ((select public.is_family_adult(public.plan_family(plan_id))));

-- Guarda el plan de la semana (reemplaza el anterior de esa semana y ese integrante).
-- p_items: [{ "activity_id": uuid, "scheduled_for": "YYYY-MM-DD", "reason": text }]
create function public.save_week_plan(
  p_family uuid,
  p_member uuid,
  p_week_start date,
  p_generator_version text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_plan uuid;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  if not public.is_family_adult(p_family, array['owner', 'guardian']) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    perform public.raise_domain_error('PLAN_EMPTY');
  end if;

  delete from public.family_plans
  where family_id = p_family and member_id is not distinct from p_member and week_start = p_week_start;

  insert into public.family_plans (family_id, member_id, week_start, generator_version, created_by)
  values (p_family, p_member, p_week_start, p_generator_version, v_user)
  returning id into v_plan;

  insert into public.plan_items (plan_id, activity_id, scheduled_for, slot, reason)
  select v_plan, (i ->> 'activity_id')::uuid, (i ->> 'scheduled_for')::date,
         (row_number() over (partition by i ->> 'scheduled_for' order by ord) - 1)::smallint,
         i ->> 'reason'
  from jsonb_array_elements(p_items) with ordinality as e (i, ord);

  return v_plan;
end;
$$;

-- Marca un ítem como hecho: registra la actividad (con participantes y valoración) en la misma
-- transacción. Cualquier adulto de la familia puede hacerlo.
create function public.complete_plan_item(p_item uuid, p_member_ids uuid[], p_rating integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.plan_items;
  v_family uuid;
  v_log uuid;
begin
  if v_user is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  select * into v_item from public.plan_items where id = p_item for update;
  v_family := public.plan_family(v_item.plan_id);
  if v_item.id is null or not public.is_family_adult(v_family) then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  if v_item.status = 'done' then
    return v_item.log_id;
  end if;

  insert into public.activity_logs (family_id, activity_id, logged_by, done_on, rating)
  values (v_family, v_item.activity_id, v_user, current_date, p_rating)
  returning id into v_log;
  insert into public.activity_log_participants (log_id, member_id)
  select v_log, m from unnest(coalesce(p_member_ids, '{}')) as m;

  update public.plan_items set status = 'done', log_id = v_log where id = p_item;
  return v_log;
end;
$$;

revoke execute on function public.save_week_plan(uuid, uuid, date, text, jsonb) from public, anon;
revoke execute on function public.complete_plan_item(uuid, uuid[], integer) from public, anon;
grant execute on function public.save_week_plan(uuid, uuid, date, text, jsonb) to authenticated;
grant execute on function public.complete_plan_item(uuid, uuid[], integer) to authenticated;
