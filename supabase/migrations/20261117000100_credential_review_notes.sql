-- Revisión de credenciales con nota para el profesional (B-39).
--
-- Antes, "Pedir información" solo dejaba una fila en credential_verifications: la credencial
-- seguía "enviada" y el profesional no se enteraba. Ahora:
--   · Rechazar y pedir información exigen una nota (es lo que lee el profesional).
--   · Pedir información devuelve la credencial a "declarada", para que la corrija y la reenvíe.
--     Si no le queda otra en revisión ni verificada, el perfil deja de figurar "en revisión".
-- La firma no cambia (la API y los tipos siguen igual). La nota se lee con la RLS que ya tiene
-- credential_verifications (el profesional ve las revisiones de sus credenciales).

create or replace function public.verify_credential(
  p_credential uuid,
  p_verifier uuid,
  p_method text,
  p_result text,
  p_note text default null,
  p_valid_until date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional uuid;
  v_status text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select professional_id, status into v_professional, v_status
  from public.professional_credentials where id = p_credential for update;
  if v_professional is null then
    perform public.raise_domain_error('NOT_FOUND');
  end if;

  -- El profesional necesita saber qué corregir o por qué no se aprobó.
  if p_result in ('rejected', 'needs_info') and v_note is null then
    perform public.raise_domain_error('VALIDATION_ERROR', 'note required');
  end if;
  -- Solo se pide información sobre lo que está en revisión.
  if p_result = 'needs_info' and v_status <> 'submitted' then
    perform public.raise_domain_error('VALIDATION_ERROR', 'credential not submitted');
  end if;

  insert into public.credential_verifications (credential_id, verifier_id, method, result, evidence_note, valid_until)
  values (p_credential, p_verifier, p_method, p_result, v_note, p_valid_until);

  if p_result in ('verified', 'rejected') then
    update public.professional_credentials set status = p_result where id = p_credential;
  else
    -- needs_info: vuelve a manos del profesional (el trigger deja pasar a quien es DEFINER).
    update public.professional_credentials set status = 'declared' where id = p_credential;
  end if;

  if p_result = 'verified' then
    update public.professional_profiles
      set verification_status = 'verified', verified_at = coalesce(verified_at, now())
      where user_id = v_professional;
  elsif p_result = 'rejected' and not exists (
    select 1 from public.professional_credentials
    where professional_id = v_professional and status = 'verified'
  ) then
    update public.professional_profiles
      set verification_status = 'rejected', verified_at = null
      where user_id = v_professional;
  elsif p_result = 'needs_info' and not exists (
    select 1 from public.professional_credentials
    where professional_id = v_professional and status in ('submitted', 'verified')
  ) then
    update public.professional_profiles
      set verification_status = 'unverified'
      where user_id = v_professional and verification_status = 'pending';
  end if;

  -- La nota no va a la auditoría (puede tener datos personales): solo si la hubo.
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_verifier,
          case p_result when 'verified' then 'credential.verified'
                        when 'rejected' then 'credential.rejected'
                        else 'credential.needs_info' end,
          'professional_credential', p_credential::text,
          jsonb_build_object('method', p_method, 'professional_id', v_professional,
                             'with_note', v_note is not null));
end;
$$;

revoke execute on function public.verify_credential(uuid, uuid, text, text, text, date)
  from public, anon, authenticated;
grant execute on function public.verify_credential(uuid, uuid, text, text, text, date) to service_role;
