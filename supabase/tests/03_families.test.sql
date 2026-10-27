-- Familias, integrantes, invitaciones y consentimientos (ROLES_AND_PERMISSIONS.md §3).
-- Personas: Laura (owner), Diego (guardian invitado), Norma (caregiver invitada), Ximena (ajena).
begin;
create extension if not exists pgtap with schema extensions;

select plan(44);

create schema tests;
grant usage on schema tests to authenticated;

create function tests.login(p_user uuid, p_email text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.login(uuid, text) to authenticated;

-- Guarda ids generados durante la prueba.
create table tests.ids (k text primary key, v uuid not null);
grant select, insert on tests.ids to authenticated;
create function tests.id(p_k text) returns uuid language sql stable as $$
  select v from tests.ids where k = p_k
$$;
grant execute on function tests.id(text) to authenticated;

create function tests.token_hash(p_token text) returns bytea language sql immutable as $$
  select extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
$$;
grant execute on function tests.token_hash(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'laura@test.invalid', '{"full_name": "Laura"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'diego@test.invalid', '{"full_name": "Diego"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'norma@test.invalid', '{"full_name": "Norma"}'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'ximena@test.invalid', '{"full_name": "Ximena"}');

-- ── Laura crea la familia ───────────────────────────────────────────────
select tests.login('aaaaaaaa-0000-0000-0000-000000000001', 'laura@test.invalid');

insert into tests.ids values ('familia', public.create_family('Familia García', 'madre'));

select is(
  (select role from public.family_memberships where family_id = tests.id('familia')),
  'owner',
  'Quien crea la familia queda como owner'
);
select is(
  (select count(*)::int from public.family_preferences where family_id = tests.id('familia')),
  1,
  'La familia nace con sus preferencias'
);

-- ── Integrantes ─────────────────────────────────────────────────────────
insert into tests.ids values ('tomi',
  public.add_family_member(tests.id('familia'), ' Tomi ', date '2022-03-17', array['autos'], '2026-10-27', true));

select is(
  (select birth_month from public.family_members where id = tests.id('tomi')),
  date '2022-03-01',
  'Solo se guarda el mes de nacimiento'
);
select is(
  (select alias from public.family_members where id = tests.id('tomi')),
  'Tomi',
  'El apodo se guarda sin espacios sobrantes'
);
select is(
  (select count(*)::int from public.consents
   where member_id = tests.id('tomi') and purpose = 'child_data' and revoked_at is null),
  1,
  'El alta del integrante registra el consentimiento child_data'
);
select throws_ok(
  $$ select public.add_family_member(tests.id('familia'), 'Sofi', date '2015-09-01', '{}', '2026-10-27', false) $$,
  'P0001', 'CONSENT_REQUIRED',
  'Sin consentimiento no se puede agregar un integrante'
);
select throws_ok(
  $$ select public.add_family_member(tests.id('familia'), 'Futuro', date '2099-01-01', '{}', '2026-10-27', true) $$,
  'P0001', 'BIRTH_MONTH_IN_FUTURE',
  'El mes de nacimiento no puede ser futuro'
);
select throws_ok(
  $$ insert into public.family_members (family_id, alias, birth_month)
     values (tests.id('familia'), 'Directo', date '2020-01-01') $$,
  '42501', null,
  'No se pueden crear integrantes sin pasar por la RPC'
);
select throws_ok(
  $$ update public.family_members set birth_month = date '2022-03-15' where id = tests.id('tomi') $$,
  '23514', null,
  'birth_month siempre es el primer día del mes'
);

-- ── Invitaciones ────────────────────────────────────────────────────────
select lives_ok(
  $$ insert into public.family_invitations (family_id, email, role, token_hash, invited_by, expires_at)
     values (tests.id('familia'), 'diego@test.invalid', 'guardian', tests.token_hash('tok-diego'),
             'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '7 days') $$,
  'El owner puede invitar a un guardian'
);
select lives_ok(
  $$ insert into public.family_invitations (family_id, email, role, token_hash, invited_by, expires_at)
     values (tests.id('familia'), 'norma@test.invalid', 'caregiver', tests.token_hash('tok-norma'),
             'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '7 days') $$,
  'El owner puede invitar a una caregiver'
);
select throws_ok(
  $$ insert into public.family_invitations (family_id, email, role, token_hash, invited_by, expires_at)
     values (tests.id('familia'), 'otra@test.invalid', 'caregiver', tests.token_hash('tok-x'),
             'aaaaaaaa-0000-0000-0000-000000000002', now() + interval '7 days') $$,
  '42501', null,
  'No se puede invitar en nombre de otra persona'
);

reset role;
insert into public.family_invitations (family_id, email, role, token_hash, invited_by, created_at, expires_at)
values ((select v from tests.ids where k = 'familia'), 'vencida@test.invalid', 'caregiver',
        tests.token_hash('tok-vencida'), 'aaaaaaaa-0000-0000-0000-000000000001',
        now() - interval '10 days', now() - interval '1 day');
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000005', 'vencida@test.invalid');

-- ── Aceptar invitaciones ────────────────────────────────────────────────
select tests.login('aaaaaaaa-0000-0000-0000-000000000004', 'ximena@test.invalid');
select throws_ok(
  $$ select public.accept_family_invitation('tok-diego', 'padre') $$,
  'P0001', 'INVITATION_EMAIL_MISMATCH',
  'Una invitación solo la acepta el correo invitado'
);

select tests.login('aaaaaaaa-0000-0000-0000-000000000005', 'vencida@test.invalid');
select throws_ok(
  $$ select public.accept_family_invitation('tok-vencida', 'otro') $$,
  'P0001', 'INVITATION_EXPIRED',
  'Una invitación vencida no se puede aceptar'
);

select tests.login('aaaaaaaa-0000-0000-0000-000000000002', 'DIEGO@test.invalid');
select throws_ok(
  $$ select public.accept_family_invitation('token-inventado', 'padre') $$,
  'P0001', 'INVITATION_INVALID',
  'Un token inexistente no sirve'
);
select is(
  public.accept_family_invitation('tok-diego', 'padre'),
  tests.id('familia'),
  'Diego acepta su invitación (el correo se compara sin distinguir mayúsculas)'
);
select throws_ok(
  $$ select public.accept_family_invitation('tok-diego', 'padre') $$,
  'P0001', 'INVITATION_INVALID',
  'Una invitación no se puede reutilizar'
);
select throws_ok(
  $$ insert into public.family_invitations (family_id, email, role, token_hash, invited_by, expires_at)
     values (tests.id('familia'), 'otro-owner@test.invalid', 'owner', tests.token_hash('tok-owner'),
             'aaaaaaaa-0000-0000-0000-000000000002', now() + interval '7 days') $$,
  '42501', null,
  'Un guardian no puede invitar owners'
);
select lives_ok(
  $$ update public.family_members set alias = 'Tomás' where id = tests.id('tomi') $$,
  'Un guardian puede editar integrantes'
);

select tests.login('aaaaaaaa-0000-0000-0000-000000000003', 'norma@test.invalid');
select lives_ok(
  $$ select public.accept_family_invitation('tok-norma', 'abuela') $$,
  'Norma acepta su invitación como caregiver'
);
select is((select count(*)::int from public.family_members), 1, 'La caregiver ve a los integrantes');
select is((select count(*)::int from public.consents), 0, 'La caregiver no ve los consentimientos');
select throws_ok(
  $$ select public.add_family_member(tests.id('familia'), 'Sofi', date '2015-09-01', '{}', '2026-10-27', true) $$,
  'P0001', 'FORBIDDEN',
  'La caregiver no puede agregar integrantes'
);
update public.family_members set alias = 'Cambiado por Norma' where id = tests.id('tomi');
select throws_ok(
  $$ update public.family_members set family_id = gen_random_uuid() where id = tests.id('tomi') $$,
  '42501', null,
  'Nadie puede mover un integrante a otra familia'
);

-- ── Persona ajena ───────────────────────────────────────────────────────
select tests.login('aaaaaaaa-0000-0000-0000-000000000004', 'ximena@test.invalid');
select is((select count(*)::int from public.families), 0, 'Una persona ajena no ve la familia');
select is((select count(*)::int from public.family_members), 0, 'Una persona ajena no ve integrantes');
select is((select count(*)::int from public.profiles), 1, 'Una persona ajena no ve perfiles de la familia');
select is((select count(*)::int from public.audit_log where family_id = tests.id('familia')), 0,
  'Una persona ajena no ve la auditoría de la familia');
update public.families set name = 'Hackeada' where id = tests.id('familia');

-- ── Verificaciones como postgres ────────────────────────────────────────
reset role;
select is((select alias from public.family_members where id = tests.id('tomi')), 'Tomás',
  'La edición de la caregiver no tuvo efecto (solo la del guardian)');
select is((select name from public.families where id = tests.id('familia')), 'Familia García',
  'La edición de una persona ajena no tuvo efecto');

-- ── Co-adultos y auditoría ──────────────────────────────────────────────
select tests.login('aaaaaaaa-0000-0000-0000-000000000002', 'diego@test.invalid');
select is((select count(*)::int from public.profiles), 3, 'Los adultos de la familia ven sus nombres entre sí');

select tests.login('aaaaaaaa-0000-0000-0000-000000000001', 'laura@test.invalid');
select ok(
  (select count(*) from public.audit_log
   where family_id = tests.id('familia')
     and action in ('family.created', 'family.member_added', 'consent.granted', 'family.adult_joined',
                    'family.adult_invited')) >= 5,
  'La familia ve su auditoría'
);
select is(
  (select count(*)::int from public.audit_log
   where family_id = tests.id('familia') and action = 'family.adult_joined'),
  3,
  'Se audita cada adulto que se suma'
);

-- ── Último owner ────────────────────────────────────────────────────────
select throws_ok(
  $$ update public.family_memberships set role = 'guardian'
     where family_id = tests.id('familia') and user_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'P0001', 'LAST_FAMILY_OWNER',
  'El único owner no puede degradarse'
);
select throws_ok(
  $$ delete from public.family_memberships
     where family_id = tests.id('familia') and user_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'P0001', 'LAST_FAMILY_OWNER',
  'El único owner no puede irse'
);

-- ── Consentimientos ─────────────────────────────────────────────────────
select lives_ok(
  $$ update public.consents set revoked_at = now(), revoked_by = 'aaaaaaaa-0000-0000-0000-000000000001'
     where member_id = tests.id('tomi') and purpose = 'child_data' $$,
  'La familia puede revocar el consentimiento de un integrante'
);
select ok(
  (select archived_at is not null from public.family_members where id = tests.id('tomi')),
  'Revocar child_data archiva al integrante'
);
-- Desde el cliente, un consentimiento revocado ni siquiera es actualizable (RLS); el trigger
-- protege también frente a escrituras del servidor.
reset role;
select throws_ok(
  $$ update public.consents set revoked_at = null, revoked_by = null
     where member_id = tests.id('tomi') and purpose = 'child_data' $$,
  'P0001', 'CONSENT_ALREADY_REVOKED',
  'Un consentimiento revocado no se reactiva'
);
select tests.login('aaaaaaaa-0000-0000-0000-000000000001', 'laura@test.invalid');
select lives_ok(
  $$ insert into public.consents (purpose, family_id, granted_by, policy_version)
     values ('ai_personal_context', tests.id('familia'), 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-27') $$,
  'La familia puede otorgar el consentimiento para el contexto de IA'
);
select throws_ok(
  $$ insert into public.consents (purpose, family_id, member_id, granted_by, policy_version)
     values ('child_data', tests.id('familia'), tests.id('tomi'), 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-27') $$,
  '42501', null,
  'child_data solo se otorga junto con el alta del integrante'
);

-- ── Salir y borrar ──────────────────────────────────────────────────────
select tests.login('aaaaaaaa-0000-0000-0000-000000000003', 'norma@test.invalid');
select lives_ok(
  $$ delete from public.family_memberships
     where family_id = tests.id('familia') and user_id = 'aaaaaaaa-0000-0000-0000-000000000003' $$,
  'Una caregiver puede irse de la familia'
);
select is((select count(*)::int from public.family_members), 0, 'Después de irse, ya no ve integrantes');

select tests.login('aaaaaaaa-0000-0000-0000-000000000002', 'diego@test.invalid');
delete from public.families where id = tests.id('familia');
select is((select count(*)::int from public.families), 1, 'Un guardian no puede borrar la familia');

select tests.login('aaaaaaaa-0000-0000-0000-000000000001', 'laura@test.invalid');
delete from public.families where id = tests.id('familia');

reset role;
select is((select count(*)::int from public.family_memberships where family_id = tests.id('familia')), 0,
  'Al borrar la familia se borran sus membresías');

select * from finish();
rollback;
