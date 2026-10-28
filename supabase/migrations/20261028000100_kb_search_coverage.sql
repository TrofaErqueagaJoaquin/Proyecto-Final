-- 0009 · Búsqueda por texto completo con "cualquiera de los términos" y cobertura.
-- websearch_to_tsquery exige TODOS los términos: una pregunta natural ("se pone muy mal cuando
-- le apago la tablet, ¿qué hago?") casi nunca coincide entera con un fragmento. Ahora se busca
-- con OR entre los lexemas, se ordena por relevancia y se devuelve qué proporción de los
-- términos de la pregunta aparece en el fragmento (fts_coverage) para decidir si hay evidencia.

drop function public.kb_hybrid_search(text, extensions.vector, integer, integer);

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
  fts_coverage double precision,
  similarity double precision,
  score double precision
)
language sql
stable
set search_path = ''
as $$
  with terms as (
    select distinct lexeme
    from unnest(pg_catalog.tsvector_to_array(
      pg_catalog.to_tsvector('public.es_unaccent'::regconfig, coalesce(p_query, ''))
    )) as lexeme
  ),
  q as (
    select case when count(*) = 0 then null
           else pg_catalog.to_tsquery('simple', string_agg(quote_literal(lexeme), ' | '))
           end as any_term,
           count(*)::double precision as total
    from terms
  ),
  candidates as (
    select c.id, c.embedding, c.tsv
    from public.kb_chunks c
    join public.kb_documents d on d.id = c.document_id
    where d.status = 'indexed'
      and (p_age_months is null
           or ((d.age_min_months is null or d.age_min_months <= p_age_months)
               and (d.age_max_months is null or d.age_max_months >= p_age_months)))
  ),
  fts as (
    select c.id,
           row_number() over (order by pg_catalog.ts_rank_cd(c.tsv, q.any_term) desc)::integer as r,
           (select count(*) from terms t
            where c.tsv @@ pg_catalog.to_tsquery('simple', quote_literal(t.lexeme)))::double precision
             / q.total as coverage
    from candidates c, q
    where q.any_term is not null and c.tsv @@ q.any_term
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
    select id, sum(1.0 / (60 + r)) as score, min(fts_r) as fts_r, max(coverage) as coverage,
           max(sim) as sim
    from (
      select id, r, r as fts_r, coverage, null::double precision as sim from fts
      union all
      select id, r, null::integer, null::double precision, sim from vec
    ) u
    group by id
  )
  select c.id, d.id, d.slug, d.type, d.title, d.url_path, d.evidence_label,
         c.heading_path, c.body, f.fts_r, f.coverage, f.sim, f.score::double precision
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
