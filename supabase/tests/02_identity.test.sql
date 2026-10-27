-- Perfiles, roles administrativos y permisos (ROLES_AND_PERMISSIONS.md §2).
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- ── Helpers de prueba (se descartan con el rollback) ────────────────────
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

-- ── Datos ───────────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@test.invalid', '{"full_name": "Ana Prueba"}'),
  ('22222222-2222-2222-2222-222222222222', 'beto@test.invalid', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.invalid', '{"name": "Admin Prueba"}');

insert into public.user_roles (user_id, role_code)
values ('33333333-3333-3333-3333-333333333333', 'platform_admin');

-- ── Perfiles ────────────────────────────────────────────────────────────
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ana Prueba',
  'El perfil se crea al registrarse, con el nombre del proveedor'
);

select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'beto',
  'Sin nombre del proveedor, se usa la parte local del correo'
);

select tests.login('11111111-1111-1111-1111-111111111111', 'ana@test.invalid');

select is((select count(*)::int from public.profiles), 1, 'Ana solo ve su propio perfil');

update public.profiles set display_name = 'Hackeado' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set theme_pref = 'dark' where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select theme_pref from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'dark',
  'Ana puede editar su perfil'
);

select throws_ok(
  $$ update public.profiles set id = gen_random_uuid() where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'Nadie puede cambiar el id de un perfil'
);

-- ── Roles y permisos ────────────────────────────────────────────────────
select is((select count(*)::int from public.roles), 5, 'Los catálogos de roles son legibles');

select ok(not public.has_permission('users.read'), 'Una persona sin rol no tiene permisos administrativos');

select is((select count(*)::int from public.user_roles), 0, 'Ana no ve roles ajenos');

select throws_ok(
  $$ insert into public.user_roles (user_id, role_code)
     values ('11111111-1111-1111-1111-111111111111', 'platform_admin') $$,
  '42501', null,
  'Nadie puede asignarse un rol desde el cliente'
);

reset role;

select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'beto',
  'El intento de Ana de editar el perfil de Beto no tuvo efecto'
);

select tests.login('33333333-3333-3333-3333-333333333333', 'admin@test.invalid');

select ok(public.has_permission('users.read'), 'platform_admin tiene users.read');
select ok(not public.has_permission('content.publish'), 'platform_admin no publica contenido');
select is((select count(*)::int from public.user_roles), 1, 'Con users.read se ven todos los roles');

reset role;

select throws_ok(
  $$ delete from public.user_roles
     where user_id = '33333333-3333-3333-3333-333333333333' and role_code = 'platform_admin' $$,
  'P0001', 'LAST_PLATFORM_ADMIN',
  'No se puede quitar el último platform_admin'
);

select * from finish();
rollback;
