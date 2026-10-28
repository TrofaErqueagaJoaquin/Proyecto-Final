import { DomainErrorCodeSchema, type DomainErrorCode, type ErrorCode } from '@crecer/shared';

import { ApiError } from '@/lib/api';

// Códigos de error de Supabase Auth (AuthApiError.code) → mensajes para la persona usuaria.
// Los mensajes no revelan si un correo está registrado (no se enumeran cuentas).
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.',
  user_already_exists:
    'No pudimos crear la cuenta con ese correo. Probá ingresar o recuperar la contraseña.',
  email_exists:
    'No pudimos crear la cuenta con ese correo. Probá ingresar o recuperar la contraseña.',
  weak_password: 'La contraseña es muy débil o aparece en filtraciones conocidas. Elegí otra.',
  same_password: 'La nueva contraseña tiene que ser distinta de la anterior.',
  over_email_send_rate_limit:
    'Enviamos demasiados correos. Esperá unos minutos y volvé a intentar.',
  over_request_rate_limit: 'Hiciste muchos intentos seguidos. Esperá unos minutos.',
  provider_disabled: 'Ese método de ingreso todavía no está habilitado.',
  validation_failed: 'Revisá los datos ingresados.',
  session_expired: 'Tu sesión venció. Volvé a ingresar.',
  flow_state_expired: 'El enlace venció. Pedí uno nuevo.',
  flow_state_not_found: 'El enlace ya se usó o no es válido. Pedí uno nuevo.',
  otp_expired: 'El enlace venció. Pedí uno nuevo.',
};

const API_MESSAGES: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: 'Tu sesión venció. Volvé a ingresar.',
  FORBIDDEN: 'No tenés permiso para hacer esto.',
  MFA_REQUIRED: 'Esta acción requiere verificación en dos pasos.',
  SERVICE_UNAVAILABLE: 'No pudimos conectarnos. Revisá tu conexión.',
  RATE_LIMITED: 'Hiciste muchos intentos seguidos. Esperá unos minutos.',
};

// Errores de dominio que lanza la base (raise_domain_error) y llegan por PostgREST como P0001.
const DOMAIN_MESSAGES: Record<DomainErrorCode, string> = {
  NOT_AUTHENTICATED: 'Tu sesión venció. Volvé a ingresar.',
  FORBIDDEN: 'No tenés permiso para hacer esto.',
  CONSENT_REQUIRED: 'Falta el consentimiento requerido.',
  CONSENT_ALREADY_REVOKED: 'Ese consentimiento ya estaba revocado.',
  BIRTH_MONTH_IN_FUTURE: 'El mes de nacimiento no puede ser futuro.',
  INVITATION_INVALID: 'La invitación no existe o ya se usó. Pedí una nueva.',
  INVITATION_EXPIRED: 'La invitación venció. Pedí una nueva.',
  INVITATION_EMAIL_MISMATCH:
    'Esta invitación es para otro correo. Ingresá con la cuenta del correo invitado.',
  ALREADY_MEMBER: 'Ya sos parte de esta familia.',
  LAST_FAMILY_OWNER:
    'La familia necesita al menos un responsable principal. Asigná ese rol a otra persona primero.',
  LAST_PLATFORM_ADMIN: 'Tiene que quedar al menos una cuenta administradora.',
  AUDIT_LOG_IMMUTABLE: 'La auditoría no se puede modificar.',
  QUESTIONNAIRE_LOCKED: 'Esta versión del cuestionario ya está publicada y no se puede cambiar.',
  QUESTIONNAIRE_UNAVAILABLE: 'Este cuestionario no está disponible para esta edad.',
  ASSESSMENT_CLOSED: 'Esta evaluación ya está cerrada: no se pueden cambiar las respuestas.',
  ASSESSMENT_ALREADY_SUBMITTED: 'Esta evaluación ya se envió.',
  NOT_FOUND: 'No encontramos lo que buscabas, o ya no tenés acceso.',
  PROFESSIONAL_UNAVAILABLE: 'Ese profesional no está disponible.',
  CARE_SCOPE_REQUIRED: 'Elegí al menos una cosa para compartir.',
  CARE_SCOPE_INVALID: 'Para compartir algo de un integrante, primero compartí su perfil.',
  CARE_ALREADY_OPEN:
    'Ya tienen un acompañamiento abierto (o una solicitud pendiente) con este profesional.',
  CARE_NOT_PENDING: 'Esa solicitud ya fue respondida o cancelada.',
  CARE_NOT_OPEN: 'Ese acompañamiento ya terminó.',
};

// Códigos SQLSTATE que pueden llegar por PostgREST.
const POSTGRES_MESSAGES: Record<string, string> = {
  '42501': 'No tenés permiso para hacer esto.',
  '23505': 'Eso ya existe.',
  '23514': 'Hay datos inválidos. Revisá el formulario.',
};

/** Mensaje en lenguaje claro para cualquier error (Auth, API, base o desconocido). */
export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    // Estos mensajes de la API dicen el motivo concreto (límite del día, del mes, sin configurar).
    if (error.code === 'RATE_LIMITED' || error.code === 'ASSISTANT_DISABLED') return error.message;
    return API_MESSAGES[error.code] ?? error.message;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === 'P0001') {
      const domain = DomainErrorCodeSchema.safeParse(message);
      if (domain.success) return DOMAIN_MESSAGES[domain.data];
    }
    if (typeof code === 'string') {
      const known = AUTH_MESSAGES[code] ?? POSTGRES_MESSAGES[code];
      if (known) return known;
    }
  }
  return 'Ocurrió un error inesperado. Probá de nuevo en un rato.';
}
