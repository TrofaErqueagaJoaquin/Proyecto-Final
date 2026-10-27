-- Profesionales: directorio, verificación, acompañamientos, alcances, observaciones y objetivos.
-- Escenario de DATABASE.md §8: la psicopedagoga ve solo a Sofi; el pediatra, solo a Tomi.
begin;
create extension if not exists pgtap with schema extensions;

select plan(47);

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

-- Usuarios: Laura (owner), Norma (caregiver), Ximena (otra familia),
-- Paula (psicopedagoga), Martín (pediatra), Otto (profesional sin verificar).
insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid', '{"full_name": "Laura"}'),
  ('dddddddd-0000-0000-0000-000000000002', 'norma@test.invalid', '{"full_name": "Norma"}'),
  ('dddddddd-0000-0000-0000-000000000003', 'ximena@test.invalid', '{"full_name": "Ximena"}'),
  ('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid', '{"full_name": "Paula"}'),
  ('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid', '{"full_name": "Martín"}'),
  ('dddddddd-0000-0000-0000-000000000006', 'otto@test.invalid', '{"full_name": "Otto"}');
insert into tests.ids values
  ('laura', 'dddddddd-0000-0000-0000-000000000001'),
  ('paula', 'dddddddd-0000-0000-0000-000000000004'),
  ('martin', 'dddddddd-0000-0000-0000-000000000005'),
  ('otto', 'dddddddd-0000-0000-0000-000000000006');

select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into tests.ids values ('garcia', public.create_family('García', 'madre'));
insert into tests.ids values ('tomi',
  public.add_family_member(tests.id('garcia'), 'Tomi', date '2022-03-01', '{}', '2026-10-27', true));
insert into tests.ids values ('sofi',
  public.add_family_member(tests.id('garcia'), 'Sofi', date '2015-09-01', '{}', '2026-10-27', true));
select tests.login('dddddddd-0000-0000-0000-000000000003', 'ximena@test.invalid');
insert into tests.ids values ('pereyra', public.create_family('Pereyra', 'madre'));
insert into tests.ids values ('lola',
  public.add_family_member(tests.id('pereyra'), 'Lola', date '2019-01-01', '{}', '2026-10-27', true));
reset role;
insert into public.family_memberships (family_id, user_id, role, relationship)
values (tests.id('garcia'), 'dddddddd-0000-0000-0000-000000000002', 'caregiver', 'abuela');

-- ── Perfil y verificación ───────────────────────────────────────────────
select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
select lives_ok(
  $$ insert into public.professional_profiles (user_id, display_name, modalities, city, province)
     values (tests.id('paula'), 'Lic. Paula Ríos', array['presencial', 'virtual'], 'Mar del Plata', 'Buenos Aires') $$,
  'un profesional crea su propio perfil'
);
select throws_ok(
  $$ insert into public.professional_profiles (user_id, display_name) values (tests.id('martin'), 'Dr. Falso') $$,
  '42501', null,
  'nadie crea un perfil profesional a nombre de otro'
);
select throws_ok(
  $$ update public.professional_profiles set verification_status = 'verified' where user_id = tests.id('paula') $$,
  '42501', null,
  'el profesional no puede marcarse como verificado'
);
insert into public.professional_specialties values (tests.id('paula'), 'psicopedagogia');
with r as (
  insert into public.professional_credentials (professional_id, kind, profession, jurisdiction, license_number)
  values (tests.id('paula'), 'license', 'Psicopedagoga', 'Buenos Aires', 'MP 1234') returning id
)
insert into tests.ids select 'cred_paula', id from r;
select throws_ok(
  $$ update public.professional_credentials set status = 'verified' where id = tests.id('cred_paula') $$,
  'P0001', 'FORBIDDEN',
  'el profesional no puede verificar su propia credencial'
);
update public.professional_credentials set status = 'submitted' where id = tests.id('cred_paula');
select is(
  (select verification_status from public.professional_profiles where user_id = tests.id('paula')),
  'pending', 'enviar una credencial deja el perfil en revisión'
);
select throws_ok(
  $$ select public.verify_credential(tests.id('cred_paula'), null, 'manual', 'verified') $$,
  '42501', null,
  'un usuario común no puede ejecutar la verificación'
);

set local role anon;
select is((select count(*)::int from public.professional_profiles), 0,
  'el directorio no muestra a quien no está verificado');
reset role;
set local role service_role;
select public.verify_credential(tests.id('cred_paula'), null, 'refeps', 'verified', 'REFEPS ok');
reset role;
set local role anon;
select is((select count(*)::int from public.professional_profiles), 1,
  'una vez verificada, aparece en el directorio público');
select is((select count(*)::int from public.professional_specialties), 1,
  'el directorio muestra sus especialidades');
reset role;

-- Martín, verificado. Otto, sin verificar (solo se lo puede invitar directo).
select tests.login('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid');
insert into public.professional_profiles (user_id, display_name) values (tests.id('martin'), 'Dr. Martín Suárez');
with r as (
  insert into public.professional_credentials (professional_id, kind, profession)
  values (tests.id('martin'), 'license', 'Médico pediatra') returning id
)
insert into tests.ids select 'cred_martin', id from r;
select tests.login('dddddddd-0000-0000-0000-000000000006', 'otto@test.invalid');
insert into public.professional_profiles (user_id, display_name) values (tests.id('otto'), 'Otto Sin Verificar');
reset role;
set local role service_role;
select public.verify_credential(tests.id('cred_martin'), null, 'colegio', 'verified');
reset role;

select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select is(
  (select count(*)::int from public.professional_profiles where user_id = tests.id('otto')),
  0, 'la familia no ve a un profesional sin verificar con el que no tiene relación'
);

-- ── Pedir acompañamiento ────────────────────────────────────────────────
select tests.login('dddddddd-0000-0000-0000-000000000002', 'norma@test.invalid');
select throws_ok(
  $$ select public.request_care(tests.id('garcia'), tests.id('paula'), null,
       jsonb_build_array(jsonb_build_object('member_id', tests.id('sofi'), 'scopes', array['member_profile'])),
       '2026-10-27') $$,
  'P0001', 'FORBIDDEN',
  'la caregiver no puede pedir acompañamiento'
);
select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select throws_ok(
  $$ select public.request_care(tests.id('garcia'), tests.id('paula'), null,
       jsonb_build_array(jsonb_build_object('member_id', tests.id('sofi'), 'scopes', array['assessments'])),
       '2026-10-27') $$,
  'P0001', 'CARE_SCOPE_INVALID',
  'compartir evaluaciones exige compartir el perfil del integrante'
);
select throws_ok(
  $$ select public.request_care(tests.id('garcia'), tests.id('paula'), null,
       jsonb_build_array(jsonb_build_object('member_id', tests.id('lola'), 'scopes', array['member_profile'])),
       '2026-10-27') $$,
  'P0001', 'FORBIDDEN',
  'no se puede compartir un integrante de otra familia'
);
insert into tests.ids values ('a_paula', public.request_care(tests.id('garcia'), tests.id('paula'),
  'Nos preocupa la tarea con pantallas.',
  jsonb_build_array(jsonb_build_object('member_id', tests.id('sofi'),
    'scopes', array['member_profile', 'assessments', 'goals', 'observations'])),
  '2026-10-27'));
select is(
  (select count(*)::int from public.consents
   where family_id = tests.id('garcia') and purpose = 'professional_access' and revoked_at is null),
  4, 'cada permiso queda respaldado por su consentimiento'
);
select throws_ok(
  $$ select public.request_care(tests.id('garcia'), tests.id('paula'), null,
       jsonb_build_array(jsonb_build_object('member_id', tests.id('sofi'), 'scopes', array['member_profile'])),
       '2026-10-27') $$,
  'P0001', 'CARE_ALREADY_OPEN',
  'no puede haber dos acompañamientos abiertos con el mismo profesional'
);

select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
select throws_ok(
  $$ select public.pro_member_overview(tests.id('a_paula'), tests.id('sofi')) $$,
  'P0001', 'NOT_FOUND',
  'antes de aceptar, el profesional no ve nada'
);
select is(
  (select jsonb_array_length(public.pro_cases())), 1,
  'la solicitud aparece en la bandeja del profesional'
);
select is(
  (public.pro_cases() -> 0 ->> 'family_id')::uuid, tests.id('garcia'),
  'el caso trae la familia (para proponer objetivos)'
);
select tests.login('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid');
select throws_ok(
  $$ select public.respond_care_request(tests.id('a_paula'), true) $$,
  'P0001', 'NOT_FOUND',
  'otro profesional no puede responder una solicitud ajena'
);
select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
select public.respond_care_request(tests.id('a_paula'), true);

-- ── Alcances: la psicopedagoga ve solo a Sofi ───────────────────────────
select ok(
  public.pro_member_overview(tests.id('a_paula'), tests.id('sofi')) ? 'assessments',
  'aceptado, ve las secciones autorizadas de Sofi'
);
select is(
  (select count(*)::int from public.audit_log
   where action = 'pro.read.member_overview' and actor_id = tests.id('paula')),
  1, 'cada lectura del resumen queda en la auditoría'
);
select throws_ok(
  $$ select public.pro_member_overview(tests.id('a_paula'), tests.id('tomi')) $$,
  'P0001', 'NOT_FOUND',
  'no ve a Tomi: para ella no existe'
);
select is((select count(*)::int from public.families), 0,
  'el profesional no lee la tabla de familias');

select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select is(
  (select count(*)::int from public.audit_log
   where family_id = tests.id('garcia') and action = 'pro.read.member_overview'),
  1, 'la familia ve cuándo el profesional leyó el resumen'
);

-- El pediatra: perfil y evaluaciones de Tomi, más los objetivos de la familia.
insert into tests.ids values ('a_martin', public.request_care(tests.id('garcia'), tests.id('martin'), null,
  jsonb_build_array(
    jsonb_build_object('member_id', tests.id('tomi'), 'scopes', array['member_profile', 'assessments']),
    jsonb_build_object('member_id', null, 'scopes', array['family_goals'])),
  '2026-10-27'));
select tests.login('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid');
select public.respond_care_request(tests.id('a_martin'), true);
select throws_ok(
  $$ select public.pro_member_overview(tests.id('a_martin'), tests.id('sofi')) $$,
  'P0001', 'NOT_FOUND',
  'el pediatra no ve a Sofi'
);
select ok(
  not (public.pro_member_overview(tests.id('a_martin'), tests.id('tomi')) ? 'goals'),
  'sin el alcance goals, el resumen de Tomi no trae objetivos'
);

-- ── Observaciones ───────────────────────────────────────────────────────
select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
with r as (
  insert into public.professional_observations (assignment_id, member_id, author_id, body)
  values (tests.id('a_paula'), tests.id('sofi'), tests.id('paula'), 'Buena predisposición.') returning id
)
insert into tests.ids select 'obs', id from r;
select tests.login('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid');
select throws_ok(
  $$ insert into public.professional_observations (assignment_id, member_id, author_id, body)
     values (tests.id('a_martin'), tests.id('tomi'), tests.id('martin'), 'Sin alcance.') $$,
  'P0001', 'FORBIDDEN',
  'sin el alcance observations no se registran observaciones'
);
select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select is((select count(*)::int from public.professional_observations), 0,
  'la familia no ve las observaciones privadas');
select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
update public.professional_observations set visibility = 'shared_family' where id = tests.id('obs');
select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select is((select count(*)::int from public.professional_observations), 1,
  'la familia ve las observaciones compartidas');
select tests.login('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid');
select is((select count(*)::int from public.professional_observations), 0,
  'otro profesional sin alcance sobre Sofi no ve sus observaciones');

-- ── Objetivos ───────────────────────────────────────────────────────────
select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
with r as (
  insert into public.follow_up_goals (family_id, member_id, assignment_id, title, source, created_by)
  values (tests.id('garcia'), tests.id('sofi'), tests.id('a_paula'), 'Tarea sin celular cerca',
          'professional', tests.id('paula')) returning id
)
insert into tests.ids select 'goal_sofi', id from r;
select throws_ok(
  $$ insert into public.follow_up_goals (family_id, member_id, title, source, created_by)
     values (tests.id('garcia'), tests.id('sofi'), 'Haciéndose pasar por la familia', 'family', tests.id('paula')) $$,
  'P0001', 'FORBIDDEN',
  'el profesional no crea objetivos como si fuera la familia'
);
select lives_ok(
  $$ insert into public.goal_progress_entries (goal_id, author_id, note, progress)
     values (tests.id('goal_sofi'), tests.id('paula'), 'Dos tardes sin celular.', 40) $$,
  'el profesional registra avances de un objetivo autorizado'
);
select tests.login('dddddddd-0000-0000-0000-000000000002', 'norma@test.invalid');
select is((select count(*)::int from public.follow_up_goals), 1,
  'la caregiver ve los objetivos de la familia');
select throws_ok(
  $$ insert into public.goal_progress_entries (goal_id, author_id, note)
     values (tests.id('goal_sofi'), 'dddddddd-0000-0000-0000-000000000002', 'Intento.') $$,
  '42501', null,
  'la caregiver no registra avances'
);
select tests.login('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid');
select is((select count(*)::int from public.follow_up_goals), 0,
  'el pediatra no ve los objetivos de Sofi');
select lives_ok(
  $$ insert into public.follow_up_goals (family_id, member_id, assignment_id, title, source, created_by)
     values (tests.id('garcia'), null, tests.id('a_martin'), 'Cena sin pantallas', 'professional', tests.id('martin')) $$,
  'con family_goals, el pediatra propone un objetivo para toda la familia'
);

select tests.login('dddddddd-0000-0000-0000-000000000003', 'ximena@test.invalid');
select is(
  (select count(*)::int from public.care_assignments) + (select count(*)::int from public.follow_up_goals)
    + (select count(*)::int from public.access_grants),
  0, 'otra familia no ve acompañamientos, permisos ni objetivos ajenos'
);

-- ── Revocar ─────────────────────────────────────────────────────────────
select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select public.revoke_access_grant((
  select id from public.access_grants
  where assignment_id = tests.id('a_paula') and scope = 'assessments' and revoked_at is null));
select is(
  (select count(*)::int from public.consents c join public.access_grants g on g.consent_id = c.id
   where g.assignment_id = tests.id('a_paula') and g.scope = 'assessments' and c.revoked_at is not null),
  1, 'revocar un permiso revoca su consentimiento'
);
select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
select ok(
  not (public.pro_member_overview(tests.id('a_paula'), tests.id('sofi')) ? 'assessments'),
  'al instante deja de ver las evaluaciones'
);
select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select public.revoke_access_grant((
  select id from public.access_grants
  where assignment_id = tests.id('a_paula') and scope = 'member_profile' and revoked_at is null));
select is(
  (select count(*)::int from public.access_grants
   where assignment_id = tests.id('a_paula') and revoked_at is null),
  0, 'revocar el perfil revoca todo lo de ese integrante'
);
select tests.login('dddddddd-0000-0000-0000-000000000004', 'paula@test.invalid');
select throws_ok(
  $$ select public.pro_member_overview(tests.id('a_paula'), tests.id('sofi')) $$,
  'P0001', 'NOT_FOUND',
  'sin el perfil, Sofi deja de existir para la profesional'
);
select is((select count(*)::int from public.professional_observations where author_id = tests.id('paula')), 1,
  'el autor conserva la lectura de sus propias observaciones');
select throws_ok(
  $$ update public.professional_observations set body = 'Cambio.' where id = tests.id('obs') $$,
  'P0001', 'FORBIDDEN',
  'pero ya no puede modificarlas'
);

-- ── Finalizar y cancelar ────────────────────────────────────────────────
select tests.login('dddddddd-0000-0000-0000-000000000005', 'martin@test.invalid');
select public.end_care(tests.id('a_martin'), 'Alta.');
select throws_ok(
  $$ insert into public.follow_up_goals (family_id, member_id, assignment_id, title, source, created_by)
     values (tests.id('garcia'), null, tests.id('a_martin'), 'Después del alta', 'professional', tests.id('martin')) $$,
  'P0001', 'FORBIDDEN',
  'al finalizar, el profesional pierde todos los alcances'
);
select tests.login('dddddddd-0000-0000-0000-000000000001', 'laura@test.invalid');
select throws_ok(
  $$ select public.end_care(tests.id('a_martin')) $$,
  'P0001', 'CARE_NOT_OPEN',
  'un acompañamiento finalizado no se vuelve a finalizar'
);
-- A un profesional sin verificar se lo puede invitar directo, y la familia puede cancelar.
insert into tests.ids values ('a_otto', public.request_care(tests.id('garcia'), tests.id('otto'), null,
  jsonb_build_array(jsonb_build_object('member_id', tests.id('tomi'), 'scopes', array['member_profile'])),
  '2026-10-27'));
select is(
  (select verification_status from public.professional_profiles where user_id = tests.id('otto')),
  'unverified', 'la familia ve el estado de verificación del profesional que invitó'
);
select public.end_care(tests.id('a_otto'));
select tests.login('dddddddd-0000-0000-0000-000000000006', 'otto@test.invalid');
select throws_ok(
  $$ select public.respond_care_request(tests.id('a_otto'), true) $$,
  'P0001', 'CARE_NOT_PENDING',
  'una solicitud cancelada ya no se puede aceptar'
);

select * from finish();
rollback;
