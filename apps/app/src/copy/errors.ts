import { DomainErrorCodeSchema, type DomainErrorCode, type ErrorCode } from '@crecer/shared';

import type { ApiError } from '@/lib/api';

/** Mensaje para cuando no hay internet (o el servidor no se alcanza). */
export const NETWORK_MESSAGE = 'Parece que no hay internet. Revisá la conexión y probá de nuevo.';
/** Mensaje para cuando la sesión venció o no existe. */
export const SESSION_MESSAGE = 'Tu sesión venció. Volvé a ingresar.';

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
  session_expired: SESSION_MESSAGE,
  session_not_found: SESSION_MESSAGE,
  refresh_token_not_found: SESSION_MESSAGE,
  refresh_token_already_used: SESSION_MESSAGE,
  bad_jwt: SESSION_MESSAGE,
  no_authorization: SESSION_MESSAGE,
  flow_state_expired: 'El enlace venció. Pedí uno nuevo.',
  flow_state_not_found: 'El enlace ya se usó o no es válido. Pedí uno nuevo.',
  otp_expired: 'El enlace venció. Pedí uno nuevo.',
};

const API_MESSAGES: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: SESSION_MESSAGE,
  FORBIDDEN: 'No tenés permiso para hacer esto.',
  MFA_REQUIRED: 'Esta acción requiere verificación en dos pasos.',
  SERVICE_UNAVAILABLE: 'No pudimos conectarnos. Probá de nuevo en un rato.',
  RATE_LIMITED: 'Hiciste muchos intentos seguidos. Esperá unos minutos.',
};

// Errores de dominio que lanza la base (raise_domain_error) y llegan por PostgREST como P0001.
const DOMAIN_MESSAGES: Record<DomainErrorCode, string> = {
  NOT_AUTHENTICATED: SESSION_MESSAGE,
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
  PLAN_EMPTY:
    'No encontramos actividades que entren en su tiempo, espacio y presupuesto. Probá cambiar las preferencias.',
  PLAN_OUTSIDE_WEEK: 'Esa fecha no corresponde a la semana del plan.',
  VALIDATION_ERROR: 'Hay datos inválidos. Revisá el formulario.',
  MFA_REQUIRED: 'Esta acción requiere verificación en dos pasos.',
};

// Códigos SQLSTATE que pueden llegar por PostgREST.
const POSTGRES_MESSAGES: Record<string, string> = {
  '42501': 'No tenés permiso para hacer esto.',
  '23505': 'Eso ya existe.',
  '23514': 'Hay datos inválidos. Revisá el formulario.',
};

// Textos con los que fallan los fetch sin red: React Native, Chrome, Firefox y Safari. Supabase los
// envuelve ("TypeError: Failed to fetch") en errores de PostgREST con código vacío.
const NETWORK_PATTERN =
  /network request failed|failed to fetch|networkerror|network error|load failed|internet connection appears to be offline/i;

// Errores que Supabase usa cuando el fetch no llegó al servidor.
const NETWORK_ERROR_NAMES = new Set(['AuthRetryableFetchError', 'FunctionsFetchError']);

const SESSION_AUTH_CODES = new Set([
  'session_expired',
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'no_authorization',
]);

// Sin importar la clase en tiempo de ejecución: así `copy/` (y `ui/`) no cargan el cliente de
// Supabase solo para reconocer el error.
function asApiError(error: unknown): ApiError | null {
  return error instanceof Error && error.name === 'ApiError' && 'code' in error && 'status' in error
    ? (error as ApiError)
    : null;
}

function field(error: unknown, key: 'code' | 'message' | 'name'): string | undefined {
  if (typeof error !== 'object' || error === null || !(key in error)) return undefined;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** `true` si el error es por falta de conexión (no llegó al servidor). */
export function isNetworkError(error: unknown): boolean {
  const api = asApiError(error);
  if (api) return api.status === 0;
  const name = field(error, 'name');
  if (name && NETWORK_ERROR_NAMES.has(name)) return true;
  const message = field(error, 'message');
  return message !== undefined && NETWORK_PATTERN.test(message);
}

/** `true` si la sesión venció o no existe: la salida es "Ingresar de nuevo". */
export function isSessionError(error: unknown): boolean {
  const api = asApiError(error);
  if (api) return api.code === 'UNAUTHORIZED';
  if (field(error, 'name') === 'AuthSessionMissingError') return true;
  const code = field(error, 'code');
  if (code === 'P0001') return field(error, 'message') === 'NOT_AUTHENTICATED';
  return code !== undefined && SESSION_AUTH_CODES.has(code);
}

export type ErrorKind = 'offline' | 'session' | 'other';

/** Qué tipo de error es, para elegir el aviso y el botón ("Reintentar" o "Ingresar de nuevo"). */
export function errorKind(error: unknown): ErrorKind {
  if (isNetworkError(error)) return 'offline';
  if (isSessionError(error)) return 'session';
  return 'other';
}

/** Mensaje en lenguaje claro para cualquier error (Auth, API, base, red o desconocido). */
export function friendlyError(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_MESSAGE;
  const api = asApiError(error);
  if (api) {
    // Estos mensajes de la API dicen el motivo concreto (límite del día, del mes, sin configurar).
    if (api.code === 'RATE_LIMITED' || api.code === 'ASSISTANT_DISABLED') return api.message;
    return API_MESSAGES[api.code] ?? api.message;
  }
  const code = field(error, 'code');
  if (code === 'P0001') {
    const domain = DomainErrorCodeSchema.safeParse(field(error, 'message'));
    if (domain.success) return DOMAIN_MESSAGES[domain.data];
  }
  if (code) {
    const known = AUTH_MESSAGES[code] ?? POSTGRES_MESSAGES[code];
    if (known) return known;
  }
  if (field(error, 'name') === 'AuthSessionMissingError') return SESSION_MESSAGE;
  return 'Ocurrió un error inesperado. Probá de nuevo en un rato.';
}
