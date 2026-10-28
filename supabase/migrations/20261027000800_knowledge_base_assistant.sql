-- 0008 · Base de conocimiento (RAG híbrido) y asistente con IA
-- Ver docs/planning/AI_ARCHITECTURE.md §4, §8 y §9. Todo lo del asistente lo escribe la API
-- (service_role): la app solo lee sus propias conversaciones y puede borrarlas.

create extension if not exists vector with schema extensions;

-- ── Configuración general (AI_ARCHITECTURE.md §9) ───────────────────────

create table public.app_settings (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('assistant.enabled', 'true'),
  -- Tope global del mes (ADR-028). Al llegarlo, el asistente se apaga solo hasta el mes siguiente.
  ('assistant.monthly_budget_usd', '10'),
  ('assistant.daily_messages', '30'),
  ('assistant.minute_messages', '6')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- ── Base de conocimiento ────────────────────────────────────────────────

-- Un documento por contenido publicado (los documentos subidos quedan para P1).
create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null unique references public.content_items (id) on delete cascade,
  slug text not null,
  type text not null,
  title text not null,
  -- Ruta de la app donde se lee el documento completo (la cita lleva ahí).
  url_path text,
  evidence_label text not null,
  age_min_months integer,
  age_max_months integer,
  -- Hash del texto indexado: si no cambió, no se vuelve a fragmentar ni a pagar embeddings.
  source_hash text not null,
  embedding_model text,
  status text not null default 'indexed' check (status in ('indexed', 'retired')),
  indexed_at timestamptz not null default now()
);

create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents (id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  heading_path text not null,
  body text not null check (char_length(body) between 1 and 6000),
  token_estimate integer not null check (token_estimate > 0),
  -- null = sin embedding (proveedor caído o sin clave): la búsqueda usa solo texto completo.
  embedding extensions.vector(1024),
  tsv tsvector generated always as (
    to_tsvector('public.es_unaccent'::regconfig, heading_path || ' ' || body)
  ) stored,
  unique (document_id, ordinal)
);

create index kb_chunks_tsv_idx on public.kb_chunks using gin (tsv);
create index kb_chunks_embedding_idx on public.kb_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.kb_documents enable row level security;
alter table public.kb_chunks enable row level security;
revoke all on public.kb_documents, public.kb_chunks from anon, authenticated;

-- Búsqueda híbrida: Reciprocal Rank Fusion (k = 60) entre texto completo y vectores, con filtro
-- por edad (el documento la contiene o no tiene rango). Sin embedding, solo texto completo.
create function public.kb_hybrid_search(
  p_query text,
  p_embedding extensions.vector default null,
  p_age_months integer default null,
  p_count integer default 6
)
returns table (
  chunk_id uuid,
  document_id uuid,
  slug text,
  type text,
  title text,
  url_path text,
  evidence_label text,
  heading_path text,
  body text,
  fts_rank integer,
  similarity double precision,
  score double precision
)
language sql
stable
set search_path = ''
as $$
  with candidates as (
    select c.id, c.embedding, c.tsv
    from public.kb_chunks c
    join public.kb_documents d on d.id = c.document_id
    where d.status = 'indexed'
      and (p_age_months is null
           or ((d.age_min_months is null or d.age_min_months <= p_age_months)
               and (d.age_max_months is null or d.age_max_months >= p_age_months)))
  ),
  fts as (
    select id, row_number() over (
      order by pg_catalog.ts_rank_cd(tsv, q) desc
    )::integer as r
    from candidates, websearch_to_tsquery('public.es_unaccent'::regconfig, p_query) q
    where tsv @@ q
    order by r
    limit 20
  ),
  vec as (
    select id, row_number() over (
      order by embedding operator(extensions.<=>) p_embedding
    )::integer as r,
    1 - (embedding operator(extensions.<=>) p_embedding) as sim
    from candidates
    where p_embedding is not null and embedding is not null
    order by r
    limit 20
  ),
  fused as (
    select id, sum(1.0 / (60 + r)) as score, min(fts_r) as fts_r, max(sim) as sim
    from (
      select id, r, r as fts_r, null::double precision as sim from fts
      union all
      select id, r, null::integer, sim from vec
    ) u
    group by id
  )
  select c.id, d.id, d.slug, d.type, d.title, d.url_path, d.evidence_label,
         c.heading_path, c.body, f.fts_r, f.sim, f.score::double precision
  from fused f
  join public.kb_chunks c on c.id = f.id
  join public.kb_documents d on d.id = c.document_id
  order by f.score desc, c.ordinal
  limit greatest(1, least(p_count, 12));
$$;

revoke execute on function public.kb_hybrid_search(text, extensions.vector, integer, integer)
  from public, anon, authenticated;
grant execute on function public.kb_hybrid_search(text, extensions.vector, integer, integer)
  to service_role;

-- ── Conversaciones ──────────────────────────────────────────────────────

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Sobre quién se pregunta (null = la familia en general).
  member_id uuid references public.family_members (id) on delete set null,
  title text not null default 'Nueva conversación' check (char_length(btrim(title)) between 1 and 120),
  -- Usar el contexto de la familia (requiere además el consentimiento ai_personal_context).
  use_personal_context boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Retención (AI_ARCHITECTURE.md §8): 24 h sin historial; 30 o 90 días con historial.
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index conversations_user_idx on public.conversations (user_id, updated_at desc);
create index conversations_family_idx on public.conversations (family_id);
create index conversations_member_idx on public.conversations (member_id);
create index conversations_expires_idx on public.conversations (expires_at);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null check (char_length(body) between 1 and 8000),
  -- [{ "ref": "F1", "slug": "...", "title": "...", "url_path": "..." }]
  citations jsonb not null default '[]'::jsonb,
  risk_level text check (risk_level in ('none', 'clinical', 'high')),
  outcome text check (outcome in (
    'answered', 'insufficient_evidence', 'risk_redirect', 'blocked', 'refused', 'error'
  )),
  prompt_version text,
  model text,
  created_at timestamptz not null default now()
);

create index assistant_messages_conversation_idx
  on public.assistant_messages (conversation_id, created_at);

-- Contadores sin texto (13 meses). Sin FK: sobreviven al borrado de la cuenta.
create table public.ai_usage_daily (
  day date not null,
  user_id uuid not null,
  family_id uuid,
  messages integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  cache_write_tokens bigint not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  primary key (day, user_id)
);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Vencimiento según el historial: con chat_history (de la persona) y la retención de la familia.
create function public.conversation_expiry(p_user uuid, p_family uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select now() + case
    when exists (
      select 1 from public.consents
      where granted_by = p_user and purpose = 'chat_history' and revoked_at is null
    ) and coalesce((select chat_history_enabled from public.families where id = p_family), false)
    then make_interval(days => coalesce(
      (select chat_retention_days from public.families where id = p_family), 30))
    else interval '24 hours'
  end;
$$;

revoke execute on function public.conversation_expiry(uuid, uuid) from public, anon;
grant execute on function public.conversation_expiry(uuid, uuid) to authenticated, service_role;

create function public.validate_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_id is not null and not exists (
    select 1 from public.family_members m
    where m.id = new.member_id and m.family_id = new.family_id
  ) then
    perform public.raise_domain_error('FORBIDDEN', 'member of another family');
  end if;
  if tg_op = 'UPDATE' and (new.family_id, new.user_id) is distinct from (old.family_id, old.user_id) then
    perform public.raise_domain_error('FORBIDDEN');
  end if;
  -- Cada cambio de la persona (por ejemplo, un mensaje nuevo) renueva el vencimiento. Un cambio
  -- explícito de expires_at (solo service_role: el cliente no tiene permiso) se respeta.
  if tg_op = 'INSERT' or new.expires_at = old.expires_at then
    new.expires_at := public.conversation_expiry(new.user_id, new.family_id);
  end if;
  return new;
end;
$$;

create trigger conversations_validate
  before insert or update on public.conversations
  for each row execute function public.validate_conversation();

alter table public.conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.ai_usage_daily enable row level security;
revoke all on public.conversations, public.assistant_messages, public.ai_usage_daily
  from anon, authenticated;

-- Solo su autor, y solo owner/guardian (la caregiver no usa el asistente).
grant select, delete on public.conversations to authenticated;
grant insert (family_id, user_id, member_id, title, use_personal_context)
  on public.conversations to authenticated;
grant update (title, member_id, use_personal_context) on public.conversations to authenticated;

create policy conversations_own on public.conversations
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and expires_at > now()
    and (select public.is_family_adult(family_id, array['owner', 'guardian']))
  )
  with check (
    user_id = (select auth.uid())
    and (select public.is_family_adult(family_id, array['owner', 'guardian']))
  );

-- Los mensajes los escribe la API: el historial no lo puede manipular el cliente (§7.3).
grant select on public.assistant_messages to authenticated;
create policy assistant_messages_own on public.assistant_messages
  for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id));

-- ── Cuotas, presupuesto y uso (service_role) ────────────────────────────

-- Estado del asistente para una persona: habilitado, cuotas y gasto del mes.
create function public.assistant_quota(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'enabled', coalesce((select (value)::text::boolean from public.app_settings
                         where key = 'assistant.enabled'), false),
    'monthly_budget_usd', coalesce((select (value)::text::numeric from public.app_settings
                                    where key = 'assistant.monthly_budget_usd'), 0),
    'daily_limit', coalesce((select (value)::text::integer from public.app_settings
                             where key = 'assistant.daily_messages'), 30),
    'minute_limit', coalesce((select (value)::text::integer from public.app_settings
                              where key = 'assistant.minute_messages'), 6),
    'month_cost_usd', coalesce((select sum(cost_usd) from public.ai_usage_daily
                                where day >= date_trunc('month', current_date)::date), 0),
    'today_messages', coalesce((select messages from public.ai_usage_daily
                                where day = current_date and user_id = p_user), 0),
    'minute_messages', (
      select count(*)::integer
      from public.assistant_messages m
      join public.conversations c on c.id = m.conversation_id
      where c.user_id = p_user and m.role = 'user' and m.created_at > now() - interval '1 minute'
    )
  );
$$;

-- Suma el uso de un mensaje (sin texto). El costo lo calcula la API con su tabla de precios.
create function public.add_ai_usage(
  p_user uuid,
  p_family uuid,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_cache_read_tokens bigint,
  p_cache_write_tokens bigint,
  p_cost_usd numeric
)
returns void
language sql
set search_path = ''
as $$
  insert into public.ai_usage_daily as u
    (day, user_id, family_id, messages, input_tokens, output_tokens,
     cache_read_tokens, cache_write_tokens, cost_usd)
  values (current_date, p_user, p_family, 1, p_input_tokens, p_output_tokens,
          p_cache_read_tokens, p_cache_write_tokens, p_cost_usd)
  on conflict (day, user_id) do update set
    messages = u.messages + 1,
    input_tokens = u.input_tokens + excluded.input_tokens,
    output_tokens = u.output_tokens + excluded.output_tokens,
    cache_read_tokens = u.cache_read_tokens + excluded.cache_read_tokens,
    cache_write_tokens = u.cache_write_tokens + excluded.cache_write_tokens,
    cost_usd = u.cost_usd + excluded.cost_usd,
    family_id = coalesce(excluded.family_id, u.family_id);
$$;

-- Borra las conversaciones vencidas y el uso de más de 13 meses. La corre pg_cron cada hora.
create function public.purge_expired_assistant_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.conversations where expires_at <= now();
  get diagnostics v_count = row_count;
  delete from public.ai_usage_daily where day < (current_date - interval '13 months');
  return v_count;
end;
$$;

revoke execute on function public.assistant_quota(uuid) from public, anon, authenticated;
revoke execute on function public.add_ai_usage(uuid, uuid, bigint, bigint, bigint, bigint, numeric)
  from public, anon, authenticated;
revoke execute on function public.purge_expired_assistant_data() from public, anon, authenticated;
grant execute on function public.assistant_quota(uuid) to service_role;
grant execute on function public.add_ai_usage(uuid, uuid, bigint, bigint, bigint, bigint, numeric)
  to service_role;
grant execute on function public.purge_expired_assistant_data() to service_role;

-- Retención con pg_cron, si está disponible (en Supabase sí; en el arnés local no).
do $cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-assistant-data', '17 * * * *',
                          'select public.purge_expired_assistant_data()');
  end if;
exception when others then
  raise notice 'pg_cron no disponible (%): la API filtra las conversaciones vencidas igual.', sqlerrm;
end;
$cron$;
