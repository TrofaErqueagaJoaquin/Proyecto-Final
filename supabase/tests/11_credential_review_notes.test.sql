-- Revisión de credenciales con nota: pedir información le devuelve la credencial al profesional
-- con el pedido a la vista, y rechazar o pedir información exige una nota (B-39).
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

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

insert into auth.users (id, email, raw_user_meta_data) values
  ('99999999-0000-0000-0000-000000000001', 'paula@test.invalid', '{"full_name": "Paula"}'),
  ('99999999-0000-0000-0000-000000000002', 'otra@test.invalid', '{"full_name": "Otra"}');
insert into tests.ids values
  ('paula', '99999999-0000-0000-0000-000000000001'),
  ('otra', '99999999-0000-0000-0000-000000000002');

-- Paula carga su matrícula y la envía.
select tests.login('99999999-0000-0000-0000-000000000001', 'paula@test.invalid');
insert into public.professional_profiles (user_id, display_name) values (tests.id('paula'), 'Lic. Paula Ríos');
with r as (
  insert into public.professional_credentials (professional_id, kind, profession, license_number)
  values (tests.id('paula'), 'license', 'Psicopedagoga', 'MP 1234') returning id
)
insert into tests.ids select 'cred', id from r;
update public.professional_credentials set status = 'submitted' where id = tests.id('cred');
reset role;

-- ── Pedir información ───────────────────────────────────────────────────
set local role service_role;
select throws_ok(
  $$ select public.verify_credential(tests.id('cred'), null, 'refeps', 'needs_info') $$,
  'P0001', 'VALIDATION_ERROR',
  'pedir información sin nota no se puede'
);
select throws_ok(
  $$ select public.verify_credential(tests.id('cred'), null, 'refeps', 'needs_info', '   ') $$,
  'P0001', 'VALIDATION_ERROR',
  'una nota en blanco tampoco vale'
);
select lives_ok(
  $$ select public.verify_credential(tests.id('cred'), null, 'refeps', 'needs_info',
       '  Falta la foto del dorso de la matrícula.  ') $$,
  'pedir información con nota'
);
reset role;

select is(
  (select status from public.professional_credentials where id = tests.id('cred')),
  'declared', 'la credencial vuelve a manos del profesional'
);
select is(
  (select verification_status from public.professional_profiles where user_id = tests.id('paula')),
  'unverified', 'el perfil deja de figurar en revisión'
);
select is(
  (select metadata ->> 'with_note' from public.audit_log
   where action = 'credential.needs_info' and entity_id = tests.id('cred')::text),
  'true', 'la auditoría registra que hubo nota'
);
select is(
  (select count(*)::int from public.audit_log where metadata::text like '%dorso%'),
  0, 'el texto de la nota no queda en la auditoría'
);

select tests.login('99999999-0000-0000-0000-000000000001', 'paula@test.invalid');
select is(
  (select evidence_note from public.credential_verifications
   where credential_id = tests.id('cred') and result = 'needs_info'),
  'Falta la foto del dorso de la matrícula.', 'el profesional lee el pedido (sin espacios de más)'
);
select lives_ok(
  $$ update public.professional_credentials
     set license_number = 'MP 1234-B', status = 'submitted'
     where id = tests.id('cred') $$,
  'corrige y reenvía en un solo paso'
);
select is(
  (select verification_status from public.professional_profiles where user_id = tests.id('paula')),
  'pending', 'al reenviar, el perfil vuelve a estar en revisión'
);

select tests.login('99999999-0000-0000-0000-000000000002', 'otra@test.invalid');
select is(
  (select count(*)::int from public.credential_verifications where credential_id = tests.id('cred')),
  0, 'nadie más lee las notas de la revisión'
);
reset role;

-- ── Rechazar ────────────────────────────────────────────────────────────
set local role service_role;
select throws_ok(
  $$ select public.verify_credential(tests.id('cred'), null, 'colegio', 'rejected') $$,
  'P0001', 'VALIDATION_ERROR',
  'rechazar sin nota no se puede'
);
select public.verify_credential(tests.id('cred'), null, 'colegio', 'rejected',
  'El colegio no tiene registrada esa matrícula.');
select throws_ok(
  $$ select public.verify_credential(tests.id('cred'), null, 'colegio', 'needs_info', 'Otra cosa') $$,
  'P0001', 'VALIDATION_ERROR',
  'no se pide información sobre una credencial que no está en revisión'
);
reset role;

select tests.login('99999999-0000-0000-0000-000000000001', 'paula@test.invalid');
select is(
  (select evidence_note from public.credential_verifications
   where credential_id = tests.id('cred') and result = 'rejected'),
  'El colegio no tiene registrada esa matrícula.', 'el profesional lee por qué la rechazaron'
);
reset role;

set local role service_role;
select lives_ok(
  $$ select public.verify_credential(tests.id('cred'), null, 'refeps', 'verified') $$,
  'aprobar sigue sin pedir nota'
);
reset role;

select * from finish();
rollback;
