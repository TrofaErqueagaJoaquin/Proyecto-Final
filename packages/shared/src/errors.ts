import { z } from 'zod';

/**
 * Códigos de error estables de la API. La app los traduce a mensajes amigables;
 * nunca se exponen trazas ni mensajes internos (ARCHITECTURE.md §5).
 */
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'MFA_REQUIRED',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'ASSISTANT_DISABLED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    requestId: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Errores de dominio que lanza la base de datos (`raise_domain_error` en las migraciones).
 * Llegan como mensaje de un error SQLSTATE P0001; la app los muestra con textos propios.
 */
export const DomainErrorCodeSchema = z.enum([
  'NOT_AUTHENTICATED',
  'FORBIDDEN',
  'CONSENT_REQUIRED',
  'CONSENT_ALREADY_REVOKED',
  'BIRTH_MONTH_IN_FUTURE',
  'INVITATION_INVALID',
  'INVITATION_EXPIRED',
  'INVITATION_EMAIL_MISMATCH',
  'ALREADY_MEMBER',
  'LAST_FAMILY_OWNER',
  'LAST_PLATFORM_ADMIN',
  'AUDIT_LOG_IMMUTABLE',
  'QUESTIONNAIRE_LOCKED',
  'QUESTIONNAIRE_UNAVAILABLE',
  'ASSESSMENT_CLOSED',
  'ASSESSMENT_ALREADY_SUBMITTED',
  'NOT_FOUND',
  'PROFESSIONAL_UNAVAILABLE',
  'CARE_SCOPE_REQUIRED',
  'CARE_SCOPE_INVALID',
  'CARE_ALREADY_OPEN',
  'CARE_NOT_PENDING',
  'CARE_NOT_OPEN',
  'PLAN_EMPTY',
  'PLAN_OUTSIDE_WEEK',
]);
export type DomainErrorCode = z.infer<typeof DomainErrorCodeSchema>;
