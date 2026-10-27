-- 0007 · pro_cases() devuelve también el id de la familia (lo necesita el profesional para
-- proponer objetivos: follow_up_goals.family_id). Mismo contrato y mismos permisos.

-- Casos y solicitudes del profesional, con lo mínimo de la familia (ROLES §4 regla 3).
create or replace function public.pro_cases()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(c order by c ->> 'created_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', a.id,
      'family_id', a.family_id,
      'status', a.status,
      'family_name', f.name,
      'requested_by_name', p.display_name,
      'request_message', a.request_message,
      'created_at', a.created_at,
      'responded_at', a.responded_at,
      'ended_at', a.ended_at,
      'family_scopes', coalesce((
        select jsonb_agg(g.scope order by g.scope)
        from public.access_grants g
        where g.assignment_id = a.id and g.member_id is null and g.revoked_at is null
      ), '[]'::jsonb),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'alias', m.alias,
          'age_months', public.age_in_months(m.birth_month, current_date),
          'scopes', (select jsonb_agg(g2.scope order by g2.scope)
                     from public.access_grants g2
                     where g2.assignment_id = a.id and g2.member_id = m.id and g2.revoked_at is null)
        ) order by m.alias)
        from public.family_members m
        where m.archived_at is null and exists (
          select 1 from public.access_grants g
          where g.assignment_id = a.id and g.member_id = m.id and g.revoked_at is null
        )
      ), '[]'::jsonb)
    ) as c
    from public.care_assignments a
    join public.families f on f.id = a.family_id
    left join public.profiles p on p.id = a.requested_by
    where a.professional_id = auth.uid()
  ) cases;
$$;
