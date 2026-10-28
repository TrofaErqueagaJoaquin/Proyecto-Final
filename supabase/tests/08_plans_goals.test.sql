-- Planes semanales, actividades realizadas desde el plan y objetivos de la familia.
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.login(p_user uuid, p_email text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.login(uuid, text) to authenticated;

create table tests.ids (k text primary key, v uuid not null);
grant select, insert on tests.ids to anon, authenticated, service_role;
create function tests.id(p_k text) returns uuid language sql stable as $$
  select v from tests.ids where k = p_k
$$;
grant execute on function tests.id(text) to anon, authenticated, service_role;

insert into public.activities (slug, title, summary, objective, age_min_months, age_max_months, duration_min,
                               cost_level, space, evidence_label, status, published_at)
values
  ('rincon-calma', 'Rincón de la calma', 'Un lugar tranquilo.', 'Calma', 24, 120, 10, 'free',
   'small_indoor', 'propuesta_proyecto', 'published', now()),
  ('caminata', 'Caminata', 'Salir a caminar.', 'Movimiento', 24, 216, 20, 'free',
   'outdoor', 'propuesta_proyecto', 'published', now());
insert into tests.ids select 'act_' || slug, id from public.activities;

insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-0000-0000-000000000001', 'laura@test.invalid', '{"full_name": "Laura"}'),
  ('ffffffff-0000-0000-0000-000000000002', 'norma@test.invalid', '{"full_name": "Norma"}'),
  ('ffffffff-0000-0000-0000-000000000003', 'ximena@test.invalid', '{"full_name": "Ximena"}');
insert into tests.ids values
  ('laura', 'ffffffff-0000-0000-0000-000000000001'),
  ('norma', 'ffffffff-0000-0000-0000-000000000002');

select tests.login('ffffffff-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into tests.ids values ('garcia', public.create_family('García', 'madre'));
insert into tests.ids values ('tomi',
  public.add_family_member(tests.id('garcia'), 'Tomi', date '2022-03-01', '{}', '2026-10-27', true));
select tests.login('ffffffff-0000-0000-0000-000000000003', 'ximena@test.invalid');
insert into tests.ids values ('pereyra', public.create_family('Pereyra', 'madre'));
reset role;
insert into public.family_memberships (family_id, user_id, role, relationship)
values (tests.id('garcia'), tests.id('norma'), 'caregiver', 'abuela');

-- ── Guardar el plan ─────────────────────────────────────────────────────
select tests.login('ffffffff-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into tests.ids values ('plan', public.save_week_plan(
  tests.id('garcia'), tests.id('tomi'), date '2026-11-02', 'plans.v1',
  jsonb_build_array(
    jsonb_build_object('activity_id', tests.id('act_rincon-calma'), 'scheduled_for', '2026-11-02', 'reason', 'quick'),
    jsonb_build_object('activity_id', tests.id('act_caminata'), 'scheduled_for', '2026-11-04', 'reason', 'variety')
  )));
select is((select count(*)::int from public.plan_items where plan_id = tests.id('plan')), 2,
  'la responsable guarda el plan de la semana');
select throws_ok(
  $$ select public.save_week_plan(tests.id('garcia'), null, date '2026-11-03', 'plans.v1',
       jsonb_build_array(jsonb_build_object('activity_id', tests.id('act_caminata'),
                                            'scheduled_for', '2026-11-03', 'reason', 'variety'))) $$,
  '23514', null, 'la semana empieza siempre un lunes'
);
select throws_ok(
  $$ select public.save_week_plan(tests.id('garcia'), null, date '2026-11-02', 'plans.v1',
       jsonb_build_array(jsonb_build_object('activity_id', tests.id('act_caminata'),
                                            'scheduled_for', '2026-11-20', 'reason', 'variety'))) $$,
  'P0001', 'PLAN_OUTSIDE_WEEK', 'cada ítem cae dentro de su semana'
);
select public.save_week_plan(
  tests.id('garcia'), tests.id('tomi'), date '2026-11-02', 'plans.v1',
  jsonb_build_array(jsonb_build_object('activity_id', tests.id('act_caminata'),
                                       'scheduled_for', '2026-11-03', 'reason', 'variety')));
select is(
  (select count(*)::int from public.family_plans where family_id = tests.id('garcia') and week_start = '2026-11-02'),
  1, 'volver a generar reemplaza el plan de esa semana'
);
reset role;
delete from tests.ids where k = 'plan';
insert into tests.ids select 'plan', id from public.family_plans where family_id = tests.id('garcia');
insert into tests.ids select 'item', id from public.plan_items where plan_id = tests.id('plan');

-- ── La caregiver ────────────────────────────────────────────────────────
select tests.login('ffffffff-0000-0000-0000-000000000002', 'norma@test.invalid');
select is((select count(*)::int from public.plan_items), 1, 'la caregiver ve el plan');
select throws_ok(
  $$ select public.save_week_plan(tests.id('garcia'), null, date '2026-11-09', 'plans.v1',
       jsonb_build_array(jsonb_build_object('activity_id', tests.id('act_caminata'),
                                            'scheduled_for', '2026-11-09', 'reason', 'variety'))) $$,
  'P0001', 'FORBIDDEN', 'la caregiver no arma planes'
);
select throws_ok(
  $$ update public.plan_items set activity_id = tests.id('act_rincon-calma') where id = tests.id('item') $$,
  'P0001', 'FORBIDDEN', 'la caregiver no cambia la actividad'
);
select throws_ok(
  $$ update public.plan_items set status = 'done' where id = tests.id('item') $$,
  '23514', null, 'no se puede marcar como hecho sin registrar la actividad'
);
select lives_ok(
  $$ select public.complete_plan_item(tests.id('item'), array[tests.id('tomi')], 5) $$,
  'la caregiver marca la actividad como hecha'
);
select is(
  (select count(*)::int from public.activity_logs l
   join public.activity_log_participants p on p.log_id = l.id
   where l.family_id = tests.id('garcia') and p.member_id = tests.id('tomi')),
  1, 'queda registrada con sus participantes'
);
select is(
  public.complete_plan_item(tests.id('item'), array[tests.id('tomi')], 5),
  (select log_id from public.plan_items where id = tests.id('item')),
  'marcarla dos veces no duplica el registro'
);

-- ── Otra idea ───────────────────────────────────────────────────────────
select tests.login('ffffffff-0000-0000-0000-000000000001', 'laura@test.invalid');
select lives_ok(
  $$ update public.plan_items set activity_id = tests.id('act_rincon-calma'), reason = 'manual'
     where id = tests.id('item') $$,
  'la responsable cambia una actividad por otra'
);

select tests.login('ffffffff-0000-0000-0000-000000000003', 'ximena@test.invalid');
select is(
  (select count(*)::int from public.family_plans) + (select count(*)::int from public.plan_items),
  0, 'otra familia no ve el plan'
);
select throws_ok(
  $$ select public.complete_plan_item(tests.id('item'), null, null) $$,
  'P0001', 'NOT_FOUND', 'otra familia no puede marcar ítems ajenos'
);

-- ── Objetivos de la familia ─────────────────────────────────────────────
select tests.login('ffffffff-0000-0000-0000-000000000001', 'laura@test.invalid');
with g as (
  insert into public.follow_up_goals (family_id, member_id, title, source, created_by)
  values (tests.id('garcia'), tests.id('tomi'), 'Cenar sin pantallas', 'family', tests.id('laura'))
  returning id
)
insert into tests.ids select 'goal', id from g;
select lives_ok(
  $$ insert into public.follow_up_goals (family_id, member_id, title, source, created_by)
     values (tests.id('garcia'), tests.id('tomi'), 'Rutina para dormir', 'recommendation', tests.id('laura')) $$,
  'una recomendación se convierte en objetivo'
);
select lives_ok(
  $$ insert into public.goal_progress_entries (goal_id, author_id, note, progress)
     values (tests.id('goal'), tests.id('laura'), 'Tres cenas sin tele.', 40) $$,
  'la familia anota avances'
);
select throws_ok(
  $$ insert into public.follow_up_goals (family_id, title, source, assignment_id, created_by)
     values (tests.id('garcia'), 'Falso', 'professional', null, tests.id('laura')) $$,
  'P0001', 'FORBIDDEN', 'la familia no crea objetivos "del profesional"'
);
select tests.login('ffffffff-0000-0000-0000-000000000002', 'norma@test.invalid');
select is((select count(*)::int from public.follow_up_goals), 2, 'la caregiver ve los objetivos');
select throws_ok(
  $$ insert into public.follow_up_goals (family_id, title, source, created_by)
     values (tests.id('garcia'), 'Desde la caregiver', 'family', tests.id('norma')) $$,
  '42501', null, 'la caregiver no crea objetivos'
);

select * from finish();
rollback;
