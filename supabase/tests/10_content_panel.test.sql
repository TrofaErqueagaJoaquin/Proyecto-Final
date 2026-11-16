-- Carga de contenidos desde el panel: quién puede crear y publicar, que la fila quede marcada como
-- del panel y que la excepción de segundo factor valga solo en la demo y solo para contenidos.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.login(p_user uuid, p_email text, p_aal text default 'aal2') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.login(uuid, text, text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('88888888-0000-0000-0000-000000000001', 'editora@test.invalid', '{"full_name": "Editora"}'),
  ('88888888-0000-0000-0000-000000000002', 'publica@test.invalid', '{"full_name": "Publica"}'),
  ('88888888-0000-0000-0000-000000000003', 'admin@test.invalid', '{"full_name": "Admin"}'),
  ('88888888-0000-0000-0000-000000000004', 'laura@test.invalid', '{"full_name": "Laura"}');
insert into public.user_roles (user_id, role_code) values
  ('88888888-0000-0000-0000-000000000001', 'content_editor'),
  ('88888888-0000-0000-0000-000000000002', 'content_publisher'),
  ('88888888-0000-0000-0000-000000000003', 'platform_admin');
insert into public.activity_categories (code, label) values ('movimiento', 'Movimiento')
  on conflict do nothing;

create table tests.payload (k text primary key, v jsonb not null);
grant select, insert on tests.payload to authenticated;
insert into tests.payload values ('aaa', '{
  "slug": "aaa", "title": "AAA", "summary": "Una actividad de prueba.",
  "age_min_months": 24, "age_max_months": 72, "duration_min": 10,
  "cost_level": "free", "space": "indoor",
  "steps": ["Primero esto.", "  ", "Después aquello."], "categories": ["movimiento"]
}');

-- ── Editora: crea en borrador, no publica ───────────────────────────────
select tests.login('88888888-0000-0000-0000-000000000001', 'editora@test.invalid');
select lives_ok(
  $$ select public.admin_create_activity((select v from tests.payload where k = 'aaa')) $$,
  'la editora carga una actividad'
);
select ok(
  (select status = 'draft' and origin = 'panel'
     and created_by = '88888888-0000-0000-0000-000000000001'
   from public.activities where slug = 'aaa'),
  'queda en borrador, marcada como del panel y con quién la cargó'
);
select is(
  (select count(*)::int from public.activity_steps s join public.activities a on a.id = s.activity_id
   where a.slug = 'aaa'),
  2, 'la editora ve los pasos de su borrador (y los vacíos no se guardan)'
);
select throws_ok(
  $$ select public.admin_create_activity((select v || '{"publish": "abc"}' from tests.payload where k = 'aaa')) $$,
  'P0001', 'VALIDATION_ERROR', 'un dato con el tipo equivocado es un error de validación'
);
select throws_ok(
  $$ select public.admin_create_activity((select v || '{"source_ids": ["xx"]}' from tests.payload where k = 'aaa')) $$,
  'P0001', 'VALIDATION_ERROR', 'una fuente con un identificador inválido también'
);
select throws_ok(
  $$ select public.admin_create_activity((select v || '{"publish": true}' from tests.payload where k = 'aaa')) $$,
  'P0001', 'FORBIDDEN', 'una editora no publica'
);
select throws_ok(
  $$ select public.admin_create_activity((select v || '{"categories": ["no-existe"]}' from tests.payload where k = 'aaa')) $$,
  'P0001', 'VALIDATION_ERROR', 'una categoría inexistente no se acepta'
);

-- ── Publicadora: crea publicada; el identificador repetido se numera ────
select tests.login('88888888-0000-0000-0000-000000000002', 'publica@test.invalid');
select is(
  public.admin_create_activity((select v || '{"publish": true}' from tests.payload where k = 'aaa')) ->> 'slug',
  'aaa-2', 'si el identificador existe, se numera'
);
select ok(
  (select status = 'published' and published_at is not null from public.activities where slug = 'aaa-2'),
  'la publicadora la publica al crearla'
);
select is(
  (select count(*)::int from public.activity_steps s join public.activities a on a.id = s.activity_id
   where a.slug = 'aaa-2'),
  2, 'los pasos de una publicada se ven'
);
insert into tests.payload
  select 'source', public.admin_create_source('{"slug": "guia-prueba", "citation": "Guía de prueba (2026)."}');
select ok(
  (select origin = 'panel' and verification_status = 'unverified' from public.sources
   where slug = 'guia-prueba'),
  'una fuente nueva queda sin verificar'
);
select lives_ok(
  $$ select public.admin_create_content_item(jsonb_build_object(
       'slug', 'ficha-prueba', 'type', 'guide', 'title', 'Ficha', 'summary', 'Resumen.',
       'body_md', 'Texto.', 'publish', true,
       'source_ids', jsonb_build_array((select v ->> 'id' from tests.payload where k = 'source')))) $$,
  'carga una ficha con su fuente'
);
select is(
  (select count(*)::int from public.content_sources cs join public.content_items c on c.id = cs.content_id
   where c.slug = 'ficha-prueba'),
  1, 'la ficha queda unida a la fuente'
);
insert into tests.payload
  select 'solita', public.admin_create_source('{"slug": "sin-citar", "citation": "Fuente que nadie cita (2026)."}');
reset role;
select is(
  (select count(*)::int from public.audit_log where action = 'content.created'),
  5, 'cada alta queda en la auditoría'
);

-- ── Fuentes en público ──────────────────────────────────────────────────
set local role anon;
select is(
  (select count(*)::int from public.sources where slug in ('guia-prueba', 'sin-citar')),
  1, 'en público, una fuente del panel se ve solo si la cita algo publicado'
);
reset role;

-- ── Sin permiso ─────────────────────────────────────────────────────────
select tests.login('88888888-0000-0000-0000-000000000004', 'laura@test.invalid');
select throws_ok(
  $$ select public.admin_create_activity((select v from tests.payload where k = 'aaa')) $$,
  'P0001', 'FORBIDDEN', 'una familia no carga contenido'
);

-- ── Segundo factor: excepción solo en la demo y solo para contenidos ───
select tests.login('88888888-0000-0000-0000-000000000001', 'editora@test.invalid', 'aal1');
select throws_ok(
  $$ select public.admin_create_activity((select v from tests.payload where k = 'aaa')) $$,
  'P0001', 'MFA_REQUIRED', 'fuera de la demo, cargar contenido pide segundo factor'
);
reset role;
insert into public.app_settings (key, value) values ('app.environment', '"demo"')
  on conflict (key) do update set value = excluded.value;
select tests.login('88888888-0000-0000-0000-000000000001', 'editora@test.invalid', 'aal1');
select lives_ok(
  $$ select public.admin_create_activity((select v from tests.payload where k = 'aaa')) $$,
  'en la demo, la editora carga sin segundo factor'
);
select is(
  (select count(*)::int from public.activities where origin = 'panel' and status = 'draft'),
  2, 'y ve sus borradores'
);
select tests.login('88888888-0000-0000-0000-000000000003', 'admin@test.invalid', 'aal1');
select throws_ok(
  $$ select public.admin_list_users(null) $$,
  'P0001', 'MFA_REQUIRED', 'en la demo, usuarios y roles siguen pidiendo segundo factor'
);
reset role;
insert into public.activities (slug, title, summary, objective, age_min_months, age_max_months,
  duration_min, cost_level, space, evidence_label, status, published_at)
values ('del-repo', 'Del repo', 'Resumen.', 'Objetivo.', 24, 72, 10, 'free', 'indoor',
  'propuesta_proyecto', 'published', now());
select tests.login('88888888-0000-0000-0000-000000000002', 'publica@test.invalid', 'aal1');
select throws_ok(
  $$ select public.admin_set_content_status('activity',
       (select id from public.activities where slug = 'del-repo'), 'archived') $$,
  'P0001', 'MFA_REQUIRED', 'en la demo, archivar algo del repositorio pide segundo factor'
);
select lives_ok(
  $$ select public.admin_set_content_status('activity',
       (select id from public.activities where slug = 'aaa-2'), 'archived') $$,
  'en la demo, lo cargado en el panel se archiva sin segundo factor'
);
select throws_ok(
  $$ select public.admin_publish_questionnaire(gen_random_uuid()) $$,
  'P0001', 'MFA_REQUIRED', 'publicar cuestionarios pide segundo factor también en la demo'
);

select * from finish();
rollback;
