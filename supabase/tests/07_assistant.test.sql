-- Base de conocimiento y asistente: búsqueda híbrida, aislamiento de conversaciones, retención y cuotas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

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

-- Vector de 1024 dimensiones con un 1 en la posición indicada (para ordenar por similitud).
create function tests.unit(p_pos integer) returns extensions.vector language sql immutable as $$
  select (
    '[' || array_to_string(array(select case when i = p_pos then '1' else '0' end
                                 from generate_series(1, 1024) i), ',') || ']'
  )::extensions.vector
$$;
grant execute on function tests.unit(integer) to service_role;

-- ── Base de conocimiento ────────────────────────────────────────────────
insert into public.content_items (slug, type, title, summary, body_md, evidence_label, status, published_at,
                                  age_min_months, age_max_months)
values
  ('sueno-pantallas', 'guide', 'Sueño y pantallas', 'Rutinas.', 'Texto.', 'recomendacion_oficial', 'published', now(), null, null),
  ('bebes-videos', 'situation_card', 'Bebés y videos', 'Videos.', 'Texto.', 'propuesta_proyecto', 'published', now(), 0, 24);
insert into public.kb_documents (content_item_id, slug, type, title, url_path, evidence_label,
                                 age_min_months, age_max_months, source_hash)
select id, slug, type, title, '/x/' || slug, evidence_label, age_min_months, age_max_months, 'h'
from public.content_items;
insert into public.kb_chunks (document_id, ordinal, heading_path, body, token_estimate, embedding)
select d.id, 0, d.title || ' › Rutina',
       case d.slug when 'sueno-pantallas'
         then 'Apagar las pantallas una hora antes de dormir ayuda a conciliar el sueño.'
         else 'Antes de los 2 años se recomienda evitar los videos, salvo videollamadas.' end,
       20, case d.slug when 'sueno-pantallas' then tests.unit(1) else tests.unit(2) end
from public.kb_documents d;

set local role service_role;
select is(
  (select slug from public.kb_hybrid_search('pantallas antes de dormir', null, null, 6) limit 1),
  'sueno-pantallas', 'el texto completo encuentra el fragmento (sin acentos ni mayúsculas)'
);
select ok(
  (select fts_coverage >= 0.4 from public.kb_hybrid_search(
     'Se pone mal cuando le apago las pantallas antes de dormir', null, null, 6) limit 1),
  'una pregunta natural encuentra el fragmento aunque no tenga todas las palabras'
);
select is(
  (select slug from public.kb_hybrid_search('zzz sin coincidencias', tests.unit(2), null, 6) limit 1),
  'bebes-videos', 'el vector encuentra el fragmento aunque no coincida el texto'
);
select is(
  (select count(*)::int from public.kb_hybrid_search('videos', tests.unit(2), 60, 6)
   where slug = 'bebes-videos'),
  0, 'el filtro por edad deja afuera lo que no corresponde (5 años)'
);
select is(
  (select count(*)::int from public.kb_hybrid_search('pantallas', null, 60, 6)
   where slug = 'sueno-pantallas'),
  1, 'un documento sin rango de edad sirve para cualquier edad'
);
reset role;

-- ── Usuarios y familias ─────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'laura@test.invalid', '{"full_name": "Laura"}'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'norma@test.invalid', '{"full_name": "Norma"}'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'diego@test.invalid', '{"full_name": "Diego"}');
insert into tests.ids values
  ('laura', 'eeeeeeee-0000-0000-0000-000000000001'),
  ('norma', 'eeeeeeee-0000-0000-0000-000000000002'),
  ('diego', 'eeeeeeee-0000-0000-0000-000000000003');
select tests.login('eeeeeeee-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into tests.ids values ('garcia', public.create_family('García', 'madre'));
reset role;
insert into public.family_memberships (family_id, user_id, role, relationship) values
  (tests.id('garcia'), tests.id('norma'), 'caregiver', 'abuela'),
  (tests.id('garcia'), tests.id('diego'), 'guardian', 'padre');

select tests.login('eeeeeeee-0000-0000-0000-000000000001', 'laura@test.invalid');
select throws_ok(
  $$ select count(*) from public.kb_chunks $$,
  '42501', null, 'la app no lee la base de conocimiento'
);
select throws_ok(
  $$ select * from public.kb_hybrid_search('pantallas') $$,
  '42501', null, 'la búsqueda solo la ejecuta la API'
);

-- ── Conversaciones ──────────────────────────────────────────────────────
with c as (
  insert into public.conversations (family_id, user_id, title)
  values (tests.id('garcia'), tests.id('laura'), 'Pantallas a la noche') returning id
)
insert into tests.ids select 'conv', id from c;
select ok(
  (select expires_at between now() + interval '23 hours' and now() + interval '25 hours'
   from public.conversations where id = tests.id('conv')),
  'sin historial activado, la conversación vence en 24 horas'
);
select throws_ok(
  $$ insert into public.assistant_messages (conversation_id, role, body)
     values (tests.id('conv'), 'assistant', 'Respuesta inventada') $$,
  '42501', null, 'el cliente no puede escribir mensajes (los escribe la API)'
);
select throws_ok(
  $$ update public.conversations set expires_at = now() + interval '10 years' where id = tests.id('conv') $$,
  '42501', null, 'el cliente no puede cambiar el vencimiento'
);

select tests.login('eeeeeeee-0000-0000-0000-000000000003', 'diego@test.invalid');
select is((select count(*)::int from public.conversations), 0,
  'otro adulto de la familia no ve las conversaciones ajenas');
select tests.login('eeeeeeee-0000-0000-0000-000000000002', 'norma@test.invalid');
select throws_ok(
  $$ insert into public.conversations (family_id, user_id) values (tests.id('garcia'), tests.id('norma')) $$,
  '42501', null, 'la caregiver no usa el asistente'
);

-- Mensajes escritos por la API (service_role): la autora los ve.
reset role;
set local role service_role;
insert into public.assistant_messages (conversation_id, role, body, risk_level, outcome)
values (tests.id('conv'), 'user', '¿Cuánta pantalla a la noche?', 'none', null),
       (tests.id('conv'), 'assistant', 'Apagar una hora antes [F1].', null, 'answered');
reset role;
select tests.login('eeeeeeee-0000-0000-0000-000000000001', 'laura@test.invalid');
select is((select count(*)::int from public.assistant_messages), 2, 'la autora ve sus mensajes');
select tests.login('eeeeeeee-0000-0000-0000-000000000003', 'diego@test.invalid');
select is((select count(*)::int from public.assistant_messages), 0, 'otro adulto no ve sus mensajes');

-- Con historial activado (consentimiento + familia), vence según la retención de la familia.
select tests.login('eeeeeeee-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into public.consents (purpose, granted_by, policy_version)
values ('chat_history', tests.id('laura'), '2026-10-27');
update public.families set chat_history_enabled = true, chat_retention_days = 90
where id = tests.id('garcia');
update public.conversations set title = 'Pantallas y sueño' where id = tests.id('conv');
select ok(
  (select expires_at > now() + interval '89 days' from public.conversations where id = tests.id('conv')),
  'con historial activado, vence a los 90 días'
);

-- ── Cuotas, uso y retención ─────────────────────────────────────────────
select throws_ok(
  $$ select public.assistant_quota(tests.id('laura')) $$,
  '42501', null, 'las cuotas solo las consulta la API'
);
reset role;
set local role service_role;
select is(
  (public.assistant_quota(tests.id('laura')) ->> 'minute_messages')::int, 1,
  'la cuota cuenta los mensajes del último minuto'
);
select public.add_ai_usage(tests.id('laura'), tests.id('garcia'), 1000, 200, 0, 0, 0.004);
select public.add_ai_usage(tests.id('laura'), tests.id('garcia'), 500, 100, 800, 0, 0.002);
select is(
  (public.assistant_quota(tests.id('laura')) ->> 'today_messages')::int, 2,
  'el uso se acumula por día y persona'
);
select is(
  (public.assistant_quota(tests.id('laura')) ->> 'month_cost_usd')::numeric, 0.006::numeric,
  'el gasto del mes se suma para el tope global'
);
select is(
  (public.assistant_quota(tests.id('laura')) ->> 'monthly_budget_usd')::numeric, 10::numeric,
  'el tope mensual inicial es de US$10'
);
reset role;
update public.conversations set expires_at = now() - interval '1 minute' where id = tests.id('conv');
set local role service_role;
select is(public.purge_expired_assistant_data(), 1, 'la retención borra las conversaciones vencidas');
select is((select count(*)::int from public.assistant_messages), 0, 'y sus mensajes en cascada');

select * from finish();
rollback;
