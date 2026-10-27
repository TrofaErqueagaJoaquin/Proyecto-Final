-- Cuestionarios versionados, intentos, respuestas, resultados y recomendaciones.
begin;
create extension if not exists pgtap with schema extensions;

select plan(35);

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
grant select, insert on tests.ids to authenticated, service_role;
create function tests.id(p_k text) returns uuid language sql stable as $$
  select v from tests.ids where k = p_k
$$;
grant execute on function tests.id(text) to anon, authenticated, service_role;

-- ── Catálogo: una versión publicada (v1) y un borrador (v2) ─────────────
insert into public.content_items (slug, type, title, summary, body_md, evidence_label, status, published_at)
values ('sueno-y-pantallas', 'guide', 'Sueño y pantallas', 'Rutinas.', 'Texto.', 'propuesta_proyecto', 'published', now());
insert into public.activities (slug, title, summary, objective, age_min_months, age_max_months, duration_min,
                               cost_level, space, evidence_label, status, published_at)
values ('rincon-calma', 'Rincón de la calma', 'Un lugar tranquilo.', 'Calma', 24, 120, 10, 'free',
        'small_indoor', 'propuesta_proyecto', 'published', now());

insert into public.questionnaires (slug, title, description)
values ('habitos', 'Hábitos', 'Hábitos digitales y rutinas.');
insert into public.questionnaire_versions (questionnaire_id, version, evidence_label, estimated_minutes,
                                           min_age_months, max_age_months, scoring_spec)
select id, v, 'propuesta_proyecto', 6, 0, 215, '{"engineVersion": "1.0.0"}'::jsonb
from public.questionnaires, (values (1), (2)) as versions (v);
insert into tests.ids select 'v' || version, id from public.questionnaire_versions;

insert into public.questionnaire_sections (version_id, code, title, position)
select id, 'sueno', 'Sueño', 1 from public.questionnaire_versions;
insert into public.questions (section_id, code, prompt, type, position)
select s.id, 'screens_before_bed', '¿Pantallas antes de dormir?', 'single', 1
from public.questionnaire_sections s;
insert into public.questions (section_id, code, prompt, type, position)
select s.id, 'calm_strategies', '¿Qué lo calma?', 'multi', 2 from public.questionnaire_sections s;
insert into public.questions (section_id, code, prompt, type, number_min, number_max, number_step, unit, position)
select s.id, 'sleep_hours', '¿Cuántas horas duerme?', 'number', 0, 24, 0.5, 'horas', 3
from public.questionnaire_sections s;
insert into public.question_options (question_id, code, label, value, position)
select q.id, o.code, o.label, o.value, o.position
from public.questions q
cross join (values ('never', 'Nunca', 100, 1), ('daily', 'Todos los días', 0, 2)) as o (code, label, value, position)
where q.code = 'screens_before_bed';
insert into public.question_options (question_id, code, label, value, position)
select q.id, o.code, o.label, o.value, o.position
from public.questions q
cross join (values ('hug', 'Abrazo', 50, 1), ('walk', 'Caminar', 50, 2)) as o (code, label, value, position)
where q.code = 'calm_strategies';

update public.questionnaire_versions set status = 'published', published_at = now()
where id = tests.id('v1');

insert into tests.ids
select 'q_' || q.code, q.id from public.questions q
join public.questionnaire_sections s on s.id = q.section_id
where s.version_id = tests.id('v1');
insert into tests.ids
select 'o_' || o.code, o.id from public.question_options o
join public.questions q on q.id = o.question_id
join public.questionnaire_sections s on s.id = q.section_id
where s.version_id = tests.id('v1');
insert into tests.ids
select 'v2_o_never', o.id from public.question_options o
join public.questions q on q.id = o.question_id
join public.questionnaire_sections s on s.id = q.section_id
where s.version_id = tests.id('v2') and o.code = 'never';

-- ── Familias: García (Laura owner, Norma caregiver) y Pereyra (Ximena) ──
insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'laura@test.invalid', '{"full_name": "Laura"}'),
  ('cccccccc-0000-0000-0000-000000000002', 'norma@test.invalid', '{"full_name": "Norma"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'ximena@test.invalid', '{"full_name": "Ximena"}');

select tests.login('cccccccc-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into tests.ids values ('garcia', public.create_family('García', 'madre'));
insert into tests.ids values ('tomi',
  public.add_family_member(tests.id('garcia'), 'Tomi', date '2022-03-01', '{}', '2026-10-27', true));
select tests.login('cccccccc-0000-0000-0000-000000000003', 'ximena@test.invalid');
insert into tests.ids values ('pereyra', public.create_family('Pereyra', 'madre'));
reset role;
insert into public.family_memberships (family_id, user_id, role, relationship)
values (tests.id('garcia'), 'cccccccc-0000-0000-0000-000000000002', 'caregiver', 'abuela');

-- ── Empezar ─────────────────────────────────────────────────────────────
select tests.login('cccccccc-0000-0000-0000-000000000001', 'laura@test.invalid');
insert into tests.ids values ('attempt', public.start_assessment(tests.id('tomi'), tests.id('v1')));
select is(public.start_assessment(tests.id('tomi'), tests.id('v1')), tests.id('attempt'),
  'empezar de nuevo retoma el intento abierto');
select throws_ok(
  $$ select public.start_assessment(tests.id('tomi'), tests.id('v2')) $$,
  'P0001', 'QUESTIONNAIRE_UNAVAILABLE',
  'no se puede responder una versión en borrador'
);
select is(
  (select member_age_months from public.assessment_attempts where id = tests.id('attempt')),
  (extract(year from age(current_date, date '2022-03-01')) * 12
   + extract(month from age(current_date, date '2022-03-01')))::integer,
  'la edad del integrante queda congelada en meses'
);

select tests.login('cccccccc-0000-0000-0000-000000000002', 'norma@test.invalid');
select throws_ok(
  $$ select public.start_assessment(tests.id('tomi'), tests.id('v1')) $$,
  'P0001', 'FORBIDDEN',
  'la caregiver no puede empezar evaluaciones'
);
select tests.login('cccccccc-0000-0000-0000-000000000003', 'ximena@test.invalid');
select throws_ok(
  $$ select public.start_assessment(tests.id('tomi'), tests.id('v1')) $$,
  'P0001', 'FORBIDDEN',
  'otra familia no puede evaluar a un integrante ajeno'
);

-- ── Responder ───────────────────────────────────────────────────────────
select tests.login('cccccccc-0000-0000-0000-000000000001', 'laura@test.invalid');
select lives_ok(
  $$ select public.save_answer(tests.id('attempt'), tests.id('q_screens_before_bed'),
                               array[tests.id('o_daily')], null) $$,
  'owner responde una pregunta de opción única'
);
select public.save_answer(tests.id('attempt'), tests.id('q_screens_before_bed'), array[tests.id('o_never')], null);
select is(
  (select count(*)::int from public.assessment_answers
   where attempt_id = tests.id('attempt') and option_id = tests.id('o_never')),
  1, 'cambiar la respuesta la reemplaza'
);
select public.save_answer(tests.id('attempt'), tests.id('q_calm_strategies'),
                          array[tests.id('o_hug'), tests.id('o_walk')], null);
select public.save_answer(tests.id('attempt'), tests.id('q_sleep_hours'), null, 10.5);
select is((select count(*)::int from public.assessment_answers where attempt_id = tests.id('attempt')),
  4, 'opción única, selección múltiple (dos filas) y número');

select throws_ok(
  $$ insert into public.assessment_answers (attempt_id, question_id, option_id)
     values (tests.id('attempt'), tests.id('q_screens_before_bed'), tests.id('o_daily')) $$,
  'P0001', 'FORBIDDEN',
  'una pregunta de opción única no acepta dos opciones'
);
select throws_ok(
  $$ select public.save_answer(tests.id('attempt'), tests.id('q_screens_before_bed'),
                               array[tests.id('o_hug')], null) $$,
  'P0001', 'FORBIDDEN',
  'no acepta opciones de otra pregunta'
);
select throws_ok(
  $$ select public.save_answer(tests.id('attempt'), tests.id('q_screens_before_bed'), null, 3) $$,
  'P0001', 'FORBIDDEN',
  'no acepta un número en una pregunta de opciones'
);

-- ── Lo que no ven ni hacen otros ────────────────────────────────────────
select tests.login('cccccccc-0000-0000-0000-000000000002', 'norma@test.invalid');
select is((select count(*)::int from public.assessment_attempts), 0, 'la caregiver no ve evaluaciones');
select is((select count(*)::int from public.assessment_answers), 0, 'la caregiver no ve respuestas');
select throws_ok(
  $$ select public.save_answer(tests.id('attempt'), tests.id('q_sleep_hours'), null, 8) $$,
  '42501', null,
  'la caregiver no puede responder'
);
select tests.login('cccccccc-0000-0000-0000-000000000003', 'ximena@test.invalid');
select is((select count(*)::int from public.assessment_attempts), 0, 'otra familia no ve el intento');

select tests.login('cccccccc-0000-0000-0000-000000000001', 'laura@test.invalid');
select throws_ok(
  $$ update public.assessment_attempts set status = 'submitted' where id = tests.id('attempt') $$,
  '42501', null,
  'la familia no puede marcar el intento como enviado (solo descartarlo)'
);
select throws_ok(
  $$ select public.finalize_assessment(tests.id('attempt'), 'cccccccc-0000-0000-0000-000000000001',
       '1.0.0', '[]', '[]') $$,
  '42501', null,
  'finalize_assessment no se puede llamar con una sesión de usuario'
);
select ok(
  (public.questionnaire_definition(tests.id('v1')) #>> '{sections,0,questions,2,number,unit}') = 'horas'
  and jsonb_array_length(public.questionnaire_definition(tests.id('v1')) #> '{sections,0,questions,1,options}') = 2,
  'questionnaire_definition devuelve el formato del motor'
);

-- ── Enviar (lo hace la API con service_role) ────────────────────────────
reset role;
select set_config('request.jwt.claims', '', true);
set local role service_role;
select throws_ok(
  $$ select public.finalize_assessment(tests.id('attempt'), 'cccccccc-0000-0000-0000-000000000002',
       '1.0.0', '[]', '[]') $$,
  'P0001', 'FORBIDDEN',
  'finalize exige que quien envía sea owner o guardian'
);
select lives_ok(
  $$ select public.finalize_assessment(
       tests.id('attempt'), 'cccccccc-0000-0000-0000-000000000001', '1.0.0',
       '[{"code": "sueno", "rawScore": 66.67, "normalized": 67, "band": "watch",
          "contributions": [{"question": "screens_before_bed", "score": 100}]}]',
       jsonb_build_array(
         jsonb_build_object('rule', 'sleep', 'priority', 1, 'reason', 'Rutina de sueño.',
           'contentItemId', (select id from public.content_items where slug = 'sueno-y-pantallas')),
         jsonb_build_object('rule', 'calm', 'priority', 2, 'reason', 'Otras formas de calmarse.',
           'activityId', (select id from public.activities where slug = 'rincon-calma')))) $$,
  'service_role guarda el resultado'
);
select throws_ok(
  $$ select public.finalize_assessment(tests.id('attempt'), 'cccccccc-0000-0000-0000-000000000001',
       '1.0.0', '[]', '[]') $$,
  'P0001', 'ASSESSMENT_ALREADY_SUBMITTED',
  'un intento no se envía dos veces'
);
select is(
  (select action from public.audit_log where entity_id = tests.id('attempt')::text),
  'assessment.submit', 'el envío queda en la auditoría'
);

select tests.login('cccccccc-0000-0000-0000-000000000001', 'laura@test.invalid');
select is(
  (select status || ' ' || engine_version from public.assessment_attempts where id = tests.id('attempt')),
  'submitted 1.0.0', 'el intento queda enviado con la versión del motor'
);
select throws_ok(
  $$ select public.save_answer(tests.id('attempt'), tests.id('q_sleep_hours'), null, 8) $$,
  'P0001', 'ASSESSMENT_CLOSED',
  'un intento enviado no acepta más respuestas'
);
select is(
  (select band || ' ' || normalized from public.assessment_dimension_scores where attempt_id = tests.id('attempt')),
  'watch 67', 'la familia ve el resultado'
);
select is((select count(*)::int from public.recommendations), 2, 'la familia ve las recomendaciones');

update public.recommendations set status = 'accepted' where rule_code = 'sleep';
select is(
  (select status_changed_by from public.recommendations where rule_code = 'sleep'),
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  'el cambio de estado registra quién lo hizo'
);
select throws_ok(
  $$ update public.recommendations set priority = 5 where rule_code = 'sleep' $$,
  '42501', null,
  'solo se puede cambiar el estado de una recomendación'
);

select tests.login('cccccccc-0000-0000-0000-000000000002', 'norma@test.invalid');
select is(
  (select count(*)::int from public.assessment_dimension_scores)
  + (select count(*)::int from public.recommendations),
  0, 'la caregiver no ve resultados ni recomendaciones'
);

-- ── Inmutabilidad de la versión publicada ───────────────────────────────
reset role;
select throws_ok(
  $$ update public.questionnaire_versions set scoring_spec = '{}' where id = tests.id('v1') $$,
  'P0001', 'QUESTIONNAIRE_LOCKED',
  'una versión publicada no se puede editar'
);
select throws_ok(
  $$ update public.questions set prompt = 'Otra' where id = tests.id('q_sleep_hours') $$,
  'P0001', 'QUESTIONNAIRE_LOCKED',
  'las preguntas de una versión publicada no se pueden editar'
);
select throws_ok(
  $$ delete from public.question_options where id = tests.id('o_hug') $$,
  'P0001', 'QUESTIONNAIRE_LOCKED',
  'las opciones de una versión publicada no se pueden borrar'
);
select lives_ok(
  $$ update public.question_options set label = 'Siempre' where id = tests.id('v2_o_never') $$,
  'un borrador sí se puede editar'
);
select lives_ok(
  $$ update public.questionnaire_versions set status = 'retired' where id = tests.id('v1') $$,
  'una versión publicada se puede retirar'
);

-- ── Borrar ──────────────────────────────────────────────────────────────
select tests.login('cccccccc-0000-0000-0000-000000000001', 'laura@test.invalid');
delete from public.assessment_attempts where id = tests.id('attempt');
reset role;
select is(
  (select count(*)::int from public.assessment_answers where attempt_id = tests.id('attempt')),
  0, 'la familia puede borrar una evaluación enviada con sus respuestas'
);

select * from finish();
rollback;
