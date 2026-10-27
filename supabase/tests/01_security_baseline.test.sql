-- Controles transversales que deben valer para TODA tabla y función presente y futura.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

select is(
  (select count(*)::int
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0,
  'RLS habilitado en todas las tablas de public'
);

select is(
  (select count(*)::int
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%'
     )),
  0,
  'Toda función SECURITY DEFINER fija su search_path'
);

-- anon (sin sesión) solo LEE el catálogo público. Cualquier tabla nueva expuesta hace fallar esto.
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and has_table_privilege('anon', c.oid, 'select')),
  -- Más el directorio de profesionales (solo verificados y listados, por RLS).
  array['activities', 'activity_categories', 'activity_category_links', 'activity_sources',
        'activity_steps', 'content_items', 'content_sources', 'professional_profiles',
        'professional_specialties', 'sources', 'specialties'],
  'anon solo puede leer las tablas del catálogo público y del directorio'
);

select is(
  (select count(*)::int
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and (has_table_privilege('anon', c.oid, 'insert')
          or has_table_privilege('anon', c.oid, 'update')
          or has_table_privilege('anon', c.oid, 'delete'))),
  0,
  'anon no puede escribir en ninguna tabla'
);

select is(
  (select count(*)::int
   from unnest(array['public.families', 'public.family_members', 'public.family_memberships',
                     'public.family_preferences', 'public.user_roles', 'public.audit_log',
                     'public.profiles', 'public.roles', 'public.permissions']) t
   where has_table_privilege('authenticated', t, 'insert')),
  0,
  'authenticated no puede insertar directamente en tablas que se crean por RPC o trigger'
);

select ok(
  not has_function_privilege('authenticated', 'public.log_audit(text,text,text,uuid,jsonb)', 'execute'),
  'Solo el servidor escribe la auditoría'
);

select ok(
  not has_function_privilege('anon', 'public.create_family(text,text)', 'execute'),
  'anon no puede crear familias'
);

insert into public.audit_log (action, entity_type) values ('test.row', 'test');

select throws_ok(
  $$ update public.audit_log set action = 'x.y' $$,
  'P0001', 'AUDIT_LOG_IMMUTABLE',
  'La auditoría no se puede modificar, ni siquiera como postgres'
);

select * from finish();
rollback;
