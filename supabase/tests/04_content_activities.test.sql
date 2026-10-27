-- Contenido público, actividades, favoritos y actividades realizadas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

create schema tests;
grant usage on schema tests to anon, authenticated;

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
grant select, insert on tests.ids to authenticated;
create function tests.id(p_k text) returns uuid language sql stable as $$
  select v from tests.ids where k = p_k
$$;
grant execute on function tests.id(text) to anon, authenticated;
grant select on tests.ids to anon;

-- ── Catálogo (lo carga el servidor) ─────────────────────────────────────
insert into public.sources (slug, citation, study_type, year, confidence)
values ('oms-2019', 'OMS (2019). Guías de actividad física, sedentarismo y sueño.', 'guideline', 2019, 'high');

insert into public.content_items (slug, type, title, summary, body_md, evidence_label, status, published_at)
values
  ('reaccion-al-apagar', 'situation_card', 'Reacción intensa al apagar', 'Qué hacer cuando se enoja al apagar.',
   'Anticipar el final ayuda.', 'propuesta_proyecto', 'published', now()),
  ('borrador-interno', 'guide', 'Borrador', 'No publicado.', 'Texto.', 'hipotesis', 'draft', null);

insert into public.activities (slug, title, summary, objective, age_min_months, age_max_months, duration_min,
                               cost_level, space, evidence_label, status, published_at)
values
  ('circuito-living', 'Circuito en el living', 'Equilibrio con almohadones.', 'Motricidad gruesa',
   24, 72, 15, 'free', 'small_indoor', 'recomendacion_oficial', 'published', now()),
  ('actividad-borrador', 'Borrador', 'No publicada.', 'Ninguno', 0, 216, 5, 'free', 'indoor', 'hipotesis', 'draft', null);

insert into public.activity_steps (activity_id, position, body)
select id, 1, 'Armar el recorrido.' from public.activities where slug = 'circuito-living';
insert into public.activity_steps (activity_id, position, body)
select id, 1, 'Paso secreto.' from public.activities where slug = 'actividad-borrador';

insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'laura@test.invalid', '{"full_name": "Laura"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'norma@test.invalid', '{"full_name": "Norma"}'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'ximena@test.invalid', '{"full_name": "Ximena"}');

-- Dos familias: García (Laura owner, Norma caregiver) y Pereyra (Ximena owner).
select tests.login('bbbbbbbb-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into tests.ids values ('garcia', public.create_family('García', 'madre'));
insert into tests.ids values ('tomi',
  public.add_family_member(tests.id('garcia'), 'Tomi', date '2022-03-01', '{}', '2026-10-27', true));
select tests.login('bbbbbbbb-0000-0000-0000-000000000003', 'ximena@test.invalid');
insert into tests.ids values ('pereyra', public.create_family('Pereyra', 'madre'));
insert into tests.ids values ('lola',
  public.add_family_member(tests.id('pereyra'), 'Lola', date '2020-01-01', '{}', '2026-10-27', true));
reset role;
insert into public.family_memberships (family_id, user_id, role, relationship)
values ((select v from tests.ids where k = 'garcia'), 'bbbbbbbb-0000-0000-0000-000000000002', 'caregiver', 'abuela');
insert into tests.ids select 'circuito', id from public.activities where slug = 'circuito-living';

-- ── Visitante sin cuenta ────────────────────────────────────────────────
set local role anon;
select is((select count(*)::int from public.content_items), 1, 'anon ve solo el contenido publicado');
select is((select count(*)::int from public.activities), 1, 'anon ve solo las actividades publicadas');
select is((select count(*)::int from public.activity_steps), 1, 'anon no ve los pasos de borradores');
select is((select count(*)::int from public.sources), 1, 'anon ve las fuentes');
select is((select count(*)::int from public.activity_categories), 8, 'anon ve las categorías');
select throws_ok(
  $$ insert into public.content_items (slug, type, title, summary, body_md, evidence_label)
     values ('x', 'guide', 'x', 'x', 'x', 'hipotesis') $$,
  '42501', null,
  'anon no puede crear contenido'
);
select throws_ok(
  $$ select count(*) from public.families $$,
  '42501', null,
  'anon no tiene acceso a las familias'
);
reset role;

-- ── Búsqueda en español sin tildes ──────────────────────────────────────
select is(
  (select slug from public.content_items
   where search @@ websearch_to_tsquery('public.es_unaccent', 'reaccion apagar')),
  'reaccion-al-apagar',
  'La búsqueda encuentra "reacción" escrito sin tilde'
);

-- ── Favoritos ───────────────────────────────────────────────────────────
select tests.login('bbbbbbbb-0000-0000-0000-000000000001', 'laura@test.invalid');
select lives_ok(
  $$ insert into public.saved_activities (family_id, activity_id, saved_by)
     values (tests.id('garcia'), tests.id('circuito'), 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  'La owner guarda una actividad'
);

select tests.login('bbbbbbbb-0000-0000-0000-000000000002', 'norma@test.invalid');
select is((select count(*)::int from public.saved_activities), 1, 'La caregiver ve los favoritos');
select throws_ok(
  $$ insert into public.saved_activities (family_id, activity_id, saved_by)
     values (tests.id('garcia'), (select id from public.activities limit 1), 'bbbbbbbb-0000-0000-0000-000000000002') $$,
  '42501', null,
  'La caregiver no gestiona favoritos'
);

-- ── Actividades realizadas ──────────────────────────────────────────────
select lives_ok(
  $$ insert into public.activity_logs (family_id, activity_id, logged_by, rating)
     values (tests.id('garcia'), tests.id('circuito'), 'bbbbbbbb-0000-0000-0000-000000000002', 5) $$,
  'La caregiver registra una actividad realizada'
);
reset role;
insert into tests.ids select 'log', id from public.activity_logs limit 1;
select tests.login('bbbbbbbb-0000-0000-0000-000000000002', 'norma@test.invalid');
select lives_ok(
  $$ insert into public.activity_log_participants (log_id, member_id) values (tests.id('log'), tests.id('tomi')) $$,
  'Puede indicar que participó un integrante de su familia'
);
select throws_ok(
  $$ insert into public.activity_log_participants (log_id, member_id) values (tests.id('log'), tests.id('lola')) $$,
  'P0001', 'FORBIDDEN',
  'No puede sumar como participante a un integrante de otra familia'
);
select throws_ok(
  $$ insert into public.activity_logs (family_id, activity_id, logged_by)
     values (tests.id('garcia'), tests.id('circuito'), 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  '42501', null,
  'No se puede registrar en nombre de otra persona'
);

-- ── Aislamiento entre familias ──────────────────────────────────────────
select tests.login('bbbbbbbb-0000-0000-0000-000000000003', 'ximena@test.invalid');
select is((select count(*)::int from public.saved_activities), 0, 'Otra familia no ve los favoritos ajenos');
select is((select count(*)::int from public.activity_logs), 0, 'Otra familia no ve las actividades realizadas ajenas');
select is((select count(*)::int from public.activity_log_participants), 0, 'Ni sus participantes');
select throws_ok(
  $$ insert into public.activity_logs (family_id, activity_id, logged_by)
     values (tests.id('garcia'), tests.id('circuito'), 'bbbbbbbb-0000-0000-0000-000000000003') $$,
  '42501', null,
  'No se puede registrar actividad en una familia ajena'
);
select throws_ok(
  $$ update public.activities set title = 'Hackeada' $$,
  '42501', null,
  'Una persona usuaria no puede editar el catálogo'
);

select * from finish();
rollback;
