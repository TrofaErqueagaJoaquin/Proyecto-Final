-- 0010 · Las actividades del catálogo también entran a la base de conocimiento: el asistente
-- "propone estrategias y actividades del catálogo" (AI_ARCHITECTURE.md §1).

alter table public.kb_documents alter column content_item_id drop not null;
alter table public.kb_documents
  add column activity_id uuid unique references public.activities (id) on delete cascade;
alter table public.kb_documents
  add constraint kb_documents_one_source check (num_nonnulls(content_item_id, activity_id) = 1);
