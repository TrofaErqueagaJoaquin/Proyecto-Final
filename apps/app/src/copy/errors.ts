import type { ErrorCode } from '@crecer/shared';

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

/** Mensaje en lenguaje claro para cualquier error (Auth, API o desconocido). */
export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) return API_MESSAGES[error.code] ?? error.message;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code in AUTH_MESSAGES) return AUTH_MESSAGES[code] ?? '';
  }
  return 'Ocurrió un error inesperado. Probá de nuevo en un rato.';
}
