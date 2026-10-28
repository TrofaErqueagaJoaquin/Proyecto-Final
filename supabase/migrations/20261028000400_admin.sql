-- 0012 · Administración y verificación (IMPLEMENTATION_PLAN.md F10).
-- Operar la plataforma SIN acceder a datos sensibles: ningún permiso administrativo abre
-- familias, evaluaciones, conversaciones ni observaciones (lo prueba 09_admin.test.sql).
-- Toda acción administrativa exige el permiso Y una sesión con segundo factor (aal2).

-- ¿El usuario actual tiene el permiso y entró con segundo factor (MFA)?
create function public.has_admin_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission(p_code)
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

revoke execute on function public.has_admin_permission(text) from public, anon;
grant execute on function public.has_admin_permission(text) to authenticated;

create function public.require_admin_permission(p_code text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform public.raise_domain_error('NOT_AUTHENTICATED');
  end if;
  if not public.has_permission(p_code) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    perform public.raise_domain_error('MFA_REQUIRED');
  end if;
end;
$$;

revoke execute on function public.require_admin_permission(text) from public, anon, authenticated;

-- ── Verificación de profesionales (professionals.verify) ────────────────

create policy professional_profiles_select_verifier on public.professional_profiles
  for select to authenticated using ((select public.has_admin_permission('professionals.verify')));
create policy professional_credentials_select_verifier on public.professional_credentials
  for select to authenticated using ((select public.has_admin_permission('professionals.verify')));
create policy credential_verifications_select_verifier on public.credential_verifications
  for select to authenticated using ((select public.has_admin_permission('professionals.verify')));
create policy professional_specialties_select_verifier on public.professional_specialties
  for select to authenticated using ((select public.has_admin_permission('professionals.verify')));

-- ── Contenidos, actividades y cuestionarios (content.*) ─────────────────

create policy content_items_select_admin on public.content_items
  for select to authenticated using ((select public.has_admin_permission('content.edit')));
create policy activities_select_admin on public.activities
  for select to authenticated using ((select public.has_admin_permission('content.edit')));
create policy questionnaire_versions_select_admin on public.questionnaire_versions
  for select to authenticated
  using ((select public.has_admin_permission('questionnaires.manage')));

-- Cambia el estado de un contenido o una actividad. Publicar o archivar exige content.publish;
-- pasar entre borrador y revisión, content.edit (un editor no publica).
create function public.admin_set_content_status(p_kind text, p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
begin
  if p_kind not in ('content', 'activity') or p_status not in ('draft', 'in_review', 'published', 'archived') then
    perform public.raise_domain_error('VALIDATION_ERROR');
  end if;
  perform public.require_admin_permission(
    case when p_status in ('published', 'archived') then 'content.publish' else 'content.edit' end);

  if p_kind = 'content' then
    update public.content_items
      set status = p_status,
          published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end
      where id = p_id
      returning slug into v_slug;
  else
    update public.activities
      set status = p_status,
          published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end
      where id = p_id
      returning slug into v_slug;
  end if;
  if v_slug is null then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  if p_status in ('published', 'archived') then
    perform public.log_audit('content.' || p_status, p_kind, p_id::text, null,
      jsonb_build_object('slug', v_slug));
  end if;
end;
$$;

-- Publica una versión en borrador y retira la publicada anterior del mismo cuestionario.
create function public.admin_publish_questionnaire(p_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.questionnaire_versions;
begin
  perform public.require_admin_permission('content.publish');
  select * into v_row from public.questionnaire_versions where id = p_version for update;
  if v_row.id is null then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  if v_row.status <> 'draft' then
    perform public.raise_domain_error('QUESTIONNAIRE_LOCKED');
  end if;
  update public.questionnaire_versions set status = 'retired'
    where questionnaire_id = v_row.questionnaire_id and status = 'published';
  update public.questionnaire_versions set status = 'published', published_at = now()
    where id = p_version;
  perform public.log_audit('questionnaire.published', 'questionnaire_version', p_version::text,
    null, jsonb_build_object('version', v_row.version));
end;
$$;

-- ── Base de conocimiento (kb.manage) ────────────────────────────────────

grant select on public.kb_documents to authenticated;
create policy kb_documents_select_admin on public.kb_documents
  for select to authenticated using ((select public.has_admin_permission('kb.manage')));

create function public.admin_set_kb_status(p_document uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('indexed', 'retired') then
    perform public.raise_domain_error('VALIDATION_ERROR');
  end if;
  perform public.require_admin_permission('kb.manage');
  update public.kb_documents set status = p_status where id = p_document;
  if not found then
    perform public.raise_domain_error('NOT_FOUND');
  end if;
  perform public.log_audit(
    case when p_status = 'retired' then 'kb.document.retired' else 'kb.document.published' end,
    'kb_document', p_document::text, null, '{}'::jsonb);
end;
$$;

-- ── Catálogos (catalog.manage) ──────────────────────────────────────────

grant insert, update (label, position) on public.specialties to authenticated;
create policy specialties_insert_admin on public.specialties
  for insert to authenticated with check ((select public.has_admin_permission('catalog.manage')));
create policy specialties_update_admin on public.specialties
  for update to authenticated
  using ((select public.has_admin_permission('catalog.manage')))
  with check ((select public.has_admin_permission('catalog.manage')));

-- ── Configuración (settings.manage) ─────────────────────────────────────

grant select on public.app_settings to authenticated;
create policy app_settings_select_admin on public.app_settings
  for select to authenticated using ((select public.has_admin_permission('settings.manage')));

-- Solo las claves conocidas y con valores válidos (un número mal cargado no apaga nada).
create function public.admin_update_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin_permission('settings.manage');
  if not (
    (p_key = 'assistant.enabled' and jsonb_typeof(p_value) = 'boolean')
    or (p_key = 'assistant.monthly_budget_usd' and jsonb_typeof(p_value) = 'number'
        and (p_value)::text::numeric between 0 and 1000)
    or (p_key in ('assistant.daily_messages', 'assistant.minute_messages')
        and jsonb_typeof(p_value) = 'number' and (p_value)::text::numeric between 1 and 500)
  ) then
    perform public.raise_domain_error('VALIDATION_ERROR');
  end if;
  update public.app_settings set value = p_value, updated_at = now() where key = p_key;
  if not found then
    insert into public.app_settings (key, value) values (p_key, p_value);
  end if;
  perform public.log_audit('settings.updated', 'app_setting', p_key, null,
    jsonb_build_object('value', p_value));
end;
$$;

-- ── Usuarios (users.read) y uso de la IA (usage.read): solo agregados ───

-- Personas con su correo, alta y roles. Nunca familias ni contenido (ROLES §2).
create function public.admin_list_users(p_search text default null)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  roles text[],
  is_professional boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin_permission('users.read');
  return query
    select u.id, u.email::text, p.display_name, u.created_at,
           coalesce(array_agg(ur.role_code order by ur.role_code)
                    filter (where ur.role_code is not null), '{}'),
           exists (select 1 from public.professional_profiles pp where pp.user_id = u.id)
    from auth.users u
    join public.profiles p on p.id = u.id
    left join public.user_roles ur on ur.user_id = u.id
    where p_search is null or p_search = ''
       or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
    group by u.id, u.email, p.display_name, u.created_at
    order by u.created_at desc
    limit 200;
end;
$$;

-- Gasto y mensajes por día del mes (sin personas ni familias).
create function public.admin_usage_summary(p_month date default current_date)
returns table (
  day date,
  messages bigint,
  active_users bigint,
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  cost_usd numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin_permission('usage.read');
  return query
    select u.day, sum(u.messages)::bigint, count(distinct u.user_id)::bigint,
           sum(u.input_tokens)::bigint, sum(u.output_tokens)::bigint,
           sum(u.cache_read_tokens)::bigint, sum(u.cost_usd)
    from public.ai_usage_daily u
    where u.day >= date_trunc('month', p_month)::date
      and u.day < (date_trunc('month', p_month) + interval '1 month')::date
    group by u.day
    order by u.day;
end;
$$;

-- Pendientes del panel: verificaciones en cola y contenidos en revisión.
create function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.user_roles where user_id = auth.uid()) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    perform public.raise_domain_error('MFA_REQUIRED');
  end if;
  return jsonb_build_object(
    'pending_credentials', case when public.has_permission('professionals.verify') then
      (select count(*) from public.professional_credentials where status = 'submitted') end,
    'content_in_review', case when public.has_permission('content.edit') then
      (select count(*) from public.content_items where status = 'in_review')
      + (select count(*) from public.activities where status = 'in_review') end,
    'month_cost_usd', case when public.has_permission('usage.read') then
      (select coalesce(sum(cost_usd), 0) from public.ai_usage_daily
       where day >= date_trunc('month', current_date)::date) end,
    'month_budget_usd', case when public.has_permission('usage.read') then
      (select (value)::text::numeric from public.app_settings where key = 'assistant.monthly_budget_usd') end,
    'users', case when public.has_permission('users.read') then
      (select count(*) from public.profiles) end
  );
end;
$$;

revoke execute on function public.admin_set_content_status(text, uuid, text) from public, anon;
revoke execute on function public.admin_publish_questionnaire(uuid) from public, anon;
revoke execute on function public.admin_set_kb_status(uuid, text) from public, anon;
revoke execute on function public.admin_update_setting(text, jsonb) from public, anon;
revoke execute on function public.admin_list_users(text) from public, anon;
revoke execute on function public.admin_usage_summary(date) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_set_content_status(text, uuid, text) to authenticated;
grant execute on function public.admin_publish_questionnaire(uuid) to authenticated;
grant execute on function public.admin_set_kb_status(uuid, text) to authenticated;
grant execute on function public.admin_update_setting(text, jsonb) to authenticated;
grant execute on function public.admin_list_users(text) to authenticated;
grant execute on function public.admin_usage_summary(date) to authenticated;
grant execute on function public.admin_overview() to authenticated;

-- ── Auditoría (audit.read): también con segundo factor ──────────────────
drop policy audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using ((select public.has_admin_permission('audit.read')) or actor_id = (select auth.uid()));
