-- Administración: permisos por rol, segundo factor y, sobre todo, que ningún rol administrativo
-- lea datos sensibles (familias, evaluaciones, conversaciones, observaciones).
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Inicia sesión con un nivel de autenticación (aal1 = solo contraseña, aal2 = con MFA).
create function tests.login(p_user uuid, p_email text, p_aal text default 'aal2') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.login(uuid, text, text) to authenticated;

create table tests.ids (k text primary key, v uuid not null);
grant select, insert on tests.ids to anon, authenticated, service_role;
create function tests.id(p_k text) returns uuid language sql stable as $$
  select v from tests.ids where k = p_k
$$;
grant execute on function tests.id(text) to anon, authenticated, service_role;

insert into auth.users (id, email, raw_user_meta_data) values
  ('99999999-0000-0000-0000-000000000001', 'admin@test.invalid', '{"full_name": "Admin"}'),
  ('99999999-0000-0000-0000-000000000002', 'editora@test.invalid', '{"full_name": "Editora"}'),
  ('99999999-0000-0000-0000-000000000003', 'verifica@test.invalid', '{"full_name": "Verifica"}'),
  ('99999999-0000-0000-0000-000000000004', 'publica@test.invalid', '{"full_name": "Publica"}'),
  ('99999999-0000-0000-0000-000000000005', 'laura@test.invalid', '{"full_name": "Laura"}'),
  ('99999999-0000-0000-0000-000000000006', 'paula@test.invalid', '{"full_name": "Paula"}');
insert into tests.ids values
  ('admin', '99999999-0000-0000-0000-000000000001'),
  ('editora', '99999999-0000-0000-0000-000000000002'),
  ('verifica', '99999999-0000-0000-0000-000000000003'),
  ('publica', '99999999-0000-0000-0000-000000000004'),
  ('laura', '99999999-0000-0000-0000-000000000005'),
  ('paula', '99999999-0000-0000-0000-000000000006');
insert into public.user_roles (user_id, role_code) values
  (tests.id('admin'), 'platform_admin'),
  (tests.id('admin'), 'auditor'),
  (tests.id('editora'), 'content_editor'),
  (tests.id('verifica'), 'credential_verifier'),
  (tests.id('publica'), 'content_publisher');

-- Datos sensibles de una familia y una profesional.
select tests.login('99999999-0000-0000-0000-000000000005', 'laura@test.invalid');
insert into tests.ids values ('garcia', public.create_family('García', 'madre'));
insert into tests.ids values ('tomi',
  public.add_family_member(tests.id('garcia'), 'Tomi', date '2022-03-01', '{}', '2026-10-27', true));
with c as (
  insert into public.conversations (family_id, user_id, title)
  values (tests.id('garcia'), tests.id('laura'), 'Privada') returning id
)
insert into tests.ids select 'conv', id from c;
select tests.login('99999999-0000-0000-0000-000000000006', 'paula@test.invalid');
insert into public.professional_profiles (user_id, display_name) values (tests.id('paula'), 'Lic. Paula Ríos');
with c as (
  insert into public.professional_credentials (professional_id, kind, profession, license_number)
  values (tests.id('paula'), 'license', 'Psicopedagoga', 'MP 1') returning id
)
insert into tests.ids select 'cred', id from c;
update public.professional_credentials set status = 'submitted' where id = tests.id('cred');
reset role;
insert into public.assistant_messages (conversation_id, role, body)
values (tests.id('conv'), 'user', 'Pregunta privada');
insert into public.content_items (slug, type, title, summary, body_md, evidence_label, status)
values ('borrador', 'guide', 'Borrador', 'Resumen.', 'Texto.', 'propuesta_proyecto', 'in_review');
insert into tests.ids select 'draft', id from public.content_items where slug = 'borrador';

-- ── Segundo factor ──────────────────────────────────────────────────────
select tests.login('99999999-0000-0000-0000-000000000003', 'verifica@test.invalid', 'aal1');
select is((select count(*)::int from public.professional_credentials), 0,
  'sin segundo factor, la verificadora no ve las credenciales');
select throws_ok(
  $$ select public.admin_overview() $$,
  'P0001', 'MFA_REQUIRED', 'el panel pide verificación en dos pasos'
);

-- ── Verificación ────────────────────────────────────────────────────────
select tests.login('99999999-0000-0000-0000-000000000003', 'verifica@test.invalid');
select is((select count(*)::int from public.professional_credentials where status = 'submitted'), 1,
  'con MFA, la verificadora ve la cola de credenciales');
select is((public.admin_overview() ->> 'pending_credentials')::int, 1,
  'el panel muestra las verificaciones pendientes');
select ok(public.admin_overview() -> 'month_cost_usd' = 'null'::jsonb,
  'y no muestra lo que su rol no puede ver (el gasto)');
select throws_ok(
  $$ select public.admin_set_content_status('content', tests.id('draft'), 'published') $$,
  'P0001', 'FORBIDDEN', 'la verificadora no publica contenidos'
);

-- ── Contenidos ──────────────────────────────────────────────────────────
select tests.login('99999999-0000-0000-0000-000000000002', 'editora@test.invalid');
select is((select count(*)::int from public.content_items where status = 'in_review'), 1,
  'la editora ve los contenidos en revisión');
select throws_ok(
  $$ select public.admin_set_content_status('content', tests.id('draft'), 'published') $$,
  'P0001', 'FORBIDDEN', 'un content_editor no puede publicar'
);
select lives_ok(
  $$ select public.admin_set_content_status('content', tests.id('draft'), 'draft') $$,
  'la editora devuelve un contenido a borrador'
);
select tests.login('99999999-0000-0000-0000-000000000004', 'publica@test.invalid');
select public.admin_set_content_status('content', tests.id('draft'), 'published');
select ok(
  (select status = 'published' and published_at is not null from public.content_items where id = tests.id('draft')),
  'la publicadora publica y queda la fecha'
);
select is(
  (select count(*)::int from public.audit_log where action = 'content.published'),
  1, 'la publicación queda en la auditoría'
);

-- ── Configuración y usuarios ────────────────────────────────────────────
select tests.login('99999999-0000-0000-0000-000000000001', 'admin@test.invalid');
select throws_ok(
  $$ select public.admin_update_setting('assistant.monthly_budget_usd', '"mucho"') $$,
  'P0001', 'VALIDATION_ERROR', 'un valor inválido no se guarda'
);
select public.admin_update_setting('assistant.monthly_budget_usd', '5');
select is(
  (select (value)::text::numeric from public.app_settings where key = 'assistant.monthly_budget_usd'),
  5::numeric, 'la administración cambia el tope mensual'
);
select is((select count(*)::int from public.admin_list_users(null)), 6,
  'la administración lista las cuentas');
select is((select count(*)::int from public.admin_usage_summary()), 0,
  'el uso de la IA se ve solo agregado por día');
select throws_ok(
  $$ insert into public.user_roles (user_id, role_code) values (tests.id('laura'), 'platform_admin') $$,
  '42501', null, 'ni la administración asigna roles desde el cliente (solo la API)'
);

-- ── Ningún rol administrativo lee datos sensibles ───────────────────────
select is(
  (select count(*)::int from public.families) + (select count(*)::int from public.family_members)
    + (select count(*)::int from public.conversations) + (select count(*)::int from public.assistant_messages),
  0, 'platform_admin no lee familias, integrantes ni conversaciones'
);
select tests.login('99999999-0000-0000-0000-000000000004', 'publica@test.invalid');
select is(
  (select count(*)::int from public.conversations) + (select count(*)::int from public.assistant_messages)
    + (select count(*)::int from public.professional_observations)
    + (select count(*)::int from public.assessment_attempts),
  0, 'content_publisher no lee conversaciones, observaciones ni evaluaciones'
);
select tests.login('99999999-0000-0000-0000-000000000003', 'verifica@test.invalid');
select is(
  (select count(*)::int from public.conversations) + (select count(*)::int from public.families)
    + (select count(*)::int from public.professional_observations),
  0, 'credential_verifier no lee conversaciones, familias ni observaciones'
);
select tests.login('99999999-0000-0000-0000-000000000001', 'admin@test.invalid', 'aal1');
select is(
  (select count(*)::int from public.audit_log where actor_id <> tests.id('admin') or actor_id is null),
  0, 'sin segundo factor, la auditoría ajena no se ve'
);
select tests.login('99999999-0000-0000-0000-000000000001', 'admin@test.invalid');
select ok(
  (select count(*) from public.audit_log where action = 'content.published') = 1,
  'con segundo factor, la auditora ve la auditoría'
);
select throws_ok(
  $$ select public.admin_set_kb_status(gen_random_uuid(), 'retired') $$,
  'P0001', 'FORBIDDEN', 'sin kb.manage no se tocan los documentos de la base de conocimiento'
);

select * from finish();
rollback;
