// Corre las migraciones, el seed y las pruebas pgTAP de supabase/ en PGlite (Postgres en WASM),
// sin Docker. Es una APROXIMACIÓN para iterar rápido: simula solo la parte de Supabase que usan
// las migraciones (roles, esquema auth, privilegios por defecto) y un subconjunto de pgTAP.
// La fuente de verdad es `supabase test db` en CI, contra el Supabase real.
//
// Uso: pnpm db:test:local [filtro]   (filtro opcional sobre el nombre del archivo de prueba)

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { vector } from '@electric-sql/pglite-pgvector';

const root = join(import.meta.dirname, '..', 'supabase');
const filter = process.argv[2] ?? '';

const SUPABASE_STUB = `
create schema if not exists extensions;
create schema if not exists auth;
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant usage on schema public, extensions, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;
`;

// Subconjunto de pgTAP: plan, ok, is, throws_ok, lives_ok, finish. Devuelven líneas TAP.
const PGTAP_SHIM = `
create table extensions.__tap (n integer primary key, passed boolean not null);
grant all on extensions.__tap to public;
create function extensions.plan(p_count integer) returns text language plpgsql as $$
begin
  perform set_config('tap.planned', p_count::text, true);
  return '1..' || p_count;
end $$;
create function extensions.ok(p_ok boolean, p_desc text default '', p_diag text default null)
returns text language plpgsql as $$
declare v_n integer;
begin
  select count(*) + 1 into v_n from extensions.__tap;
  insert into extensions.__tap (n, passed) values (v_n, coalesce(p_ok, false));
  return case when coalesce(p_ok, false) then 'ok ' else 'not ok ' end || v_n || ' - ' || p_desc
    || case when coalesce(p_ok, false) or p_diag is null then '' else E'\\n#   ' || p_diag end;
end $$;
create function extensions.is(p_have anyelement, p_want anyelement, p_desc text default '')
returns text language sql as $$
  select extensions.ok(p_have is not distinct from p_want, p_desc,
    format('esperado: %s | obtenido: %s', coalesce(p_want::text, 'NULL'), coalesce(p_have::text, 'NULL')))
$$;
create function extensions.throws_ok(p_sql text, p_code char(5), p_msg text, p_desc text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(false, p_desc, 'no lanzó ninguna excepción');
exception when others then
  return extensions.ok(sqlstate = p_code and (p_msg is null or sqlerrm = p_msg), p_desc,
    format('esperado: %s %s | obtenido: %s %s', p_code, coalesce(p_msg, ''), sqlstate, sqlerrm));
end $$;
create function extensions.lives_ok(p_sql text, p_desc text) returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(true, p_desc);
exception when others then
  return extensions.ok(false, p_desc, format('%s %s', sqlstate, sqlerrm));
end $$;
create function extensions.finish() returns setof text language plpgsql as $$
declare v_run integer; v_failed integer; v_planned integer;
begin
  select count(*), count(*) filter (where not passed) into v_run, v_failed from extensions.__tap;
  v_planned := nullif(current_setting('tap.planned', true), '')::integer;
  if v_planned is distinct from v_run then
    return next format('# Se planearon %s pruebas y corrieron %s', v_planned, v_run);
  end if;
  if v_failed > 0 then
    return next format('# Fallaron %s de %s', v_failed, v_run);
  end if;
end $$;
grant execute on all functions in schema extensions to public;
`;

async function sqlFiles(dir, suffix) {
  const names = (await readdir(dir)).filter((n) => n.endsWith(suffix)).sort();
  return Promise.all(
    names.map(async (name) => ({ name, sql: await readFile(join(dir, name), 'utf8') })),
  );
}

function tapLines(results) {
  const lines = [];
  for (const result of results) {
    for (const row of result.rows ?? []) {
      const values = Object.values(row);
      if (values.length === 1 && typeof values[0] === 'string') lines.push(values[0]);
    }
  }
  return lines.flatMap((line) => line.split('\n'));
}

const db = await PGlite.create({ extensions: { pgcrypto, unaccent, vector } });
await db.exec(SUPABASE_STUB);
await db.exec(PGTAP_SHIM);
// Igual que Supabase: public y extensions en el search_path de todas las sesiones.
await db.exec(`set search_path = public, extensions;`);

for (const { name, sql } of await sqlFiles(join(root, 'migrations'), '.sql')) {
  try {
    await db.exec(sql);
    console.log(`✔ migración ${name}`);
  } catch (error) {
    console.error(`✖ migración ${name}\n  ${error.message}`);
    process.exit(1);
  }
}
await db.exec(await readFile(join(root, 'seed.sql'), 'utf8'));
console.log('✔ seed.sql\n');

let failedFiles = 0;
for (const { name, sql } of await sqlFiles(join(root, 'tests'), '.sql')) {
  if (!name.includes(filter)) continue;
  const body = sql.replace(/create extension if not exists pgtap[^;]*;/i, '');
  let lines;
  try {
    lines = tapLines(await db.exec(body));
  } catch (error) {
    await db.exec('rollback;').catch(() => undefined);
    console.error(`✖ ${name}: error fuera de una aserción\n  ${error.message}\n`);
    failedFiles += 1;
    continue;
  }
  const failed = lines.filter((l) => l.startsWith('not ok') || l.startsWith('# Se planearon'));
  console.log(`${failed.length === 0 ? '✔' : '✖'} ${name}`);
  for (const line of lines) {
    if (line.startsWith('not ok') || line.startsWith('#')) console.log(`  ${line}`);
  }
  if (failed.length > 0) failedFiles += 1;
}

await db.close();
if (failedFiles > 0) {
  console.error(`\n${failedFiles} archivo(s) de prueba con fallas.`);
  process.exit(1);
}
console.log('\nTodas las pruebas pasaron (PGlite). CI las corre también contra Supabase real.');
