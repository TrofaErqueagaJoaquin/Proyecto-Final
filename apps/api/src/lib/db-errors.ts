import { DomainErrorCodeSchema, type DomainErrorCode, type ErrorCode } from '@crecer/shared';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { HttpError } from './http';

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

const DOMAIN_ERRORS: Record<
  DomainErrorCode,
  { status: ContentfulStatusCode; code: ErrorCode; text: string }
> = {
  NOT_AUTHENTICATED: { status: 401, code: 'UNAUTHORIZED', text: 'Iniciá sesión para continuar.' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', text: 'No tenés permiso para hacer esto.' },
  CONSENT_REQUIRED: {
    status: 400,
    code: 'VALIDATION_ERROR',
    text: 'Falta el consentimiento requerido.',
  },
  CONSENT_ALREADY_REVOKED: {
    status: 409,
    code: 'CONFLICT',
    text: 'Ese consentimiento ya fue revocado.',
  },
  BIRTH_MONTH_IN_FUTURE: {
    status: 400,
    code: 'VALIDATION_ERROR',
    text: 'El mes de nacimiento no puede ser futuro.',
  },
  INVITATION_INVALID: {
    status: 404,
    code: 'NOT_FOUND',
    text: 'La invitación no existe o ya se usó.',
  },
  INVITATION_EXPIRED: {
    status: 410,
    code: 'CONFLICT',
    text: 'La invitación venció. Pedí una nueva.',
  },
  INVITATION_EMAIL_MISMATCH: {
    status: 403,
    code: 'FORBIDDEN',
    text: 'La invitación es para otro correo.',
  },
  ALREADY_MEMBER: { status: 409, code: 'CONFLICT', text: 'Ya sos parte de esta familia.' },
  LAST_FAMILY_OWNER: {
    status: 409,
    code: 'CONFLICT',
    text: 'La familia necesita al menos un responsable principal.',
  },
  LAST_PLATFORM_ADMIN: {
    status: 409,
    code: 'CONFLICT',
    text: 'Tiene que quedar al menos una cuenta administradora.',
  },
  AUDIT_LOG_IMMUTABLE: {
    status: 409,
    code: 'CONFLICT',
    text: 'La auditoría no se puede modificar.',
  },
  QUESTIONNAIRE_LOCKED: {
    status: 409,
    code: 'CONFLICT',
    text: 'Esa versión del cuestionario ya está publicada.',
  },
  QUESTIONNAIRE_UNAVAILABLE: {
    status: 409,
    code: 'CONFLICT',
    text: 'Este cuestionario no está disponible para esta edad.',
  },
  ASSESSMENT_CLOSED: { status: 409, code: 'CONFLICT', text: 'Esta evaluación ya está cerrada.' },
  ASSESSMENT_ALREADY_SUBMITTED: {
    status: 409,
    code: 'CONFLICT',
    text: 'Esta evaluación ya se envió.',
  },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND', text: 'No encontramos lo que buscabas.' },
  PROFESSIONAL_UNAVAILABLE: {
    status: 409,
    code: 'CONFLICT',
    text: 'Ese profesional no está disponible.',
  },
  CARE_SCOPE_REQUIRED: { status: 400, code: 'VALIDATION_ERROR', text: 'Elegí qué compartir.' },
  CARE_SCOPE_INVALID: {
    status: 400,
    code: 'VALIDATION_ERROR',
    text: 'Lo elegido para compartir no es válido.',
  },
  CARE_ALREADY_OPEN: {
    status: 409,
    code: 'CONFLICT',
    text: 'Ya hay un acompañamiento abierto con ese profesional.',
  },
  CARE_NOT_PENDING: { status: 409, code: 'CONFLICT', text: 'Esa solicitud ya fue respondida.' },
  CARE_NOT_OPEN: { status: 409, code: 'CONFLICT', text: 'Ese acompañamiento ya terminó.' },
};

/**
 * Traduce un error de Postgres/PostgREST a un error HTTP con código estable.
 * Nunca reenvía el mensaje original de la base (puede contener detalles internos).
 */
export function toHttpError(error: PostgrestLikeError): HttpError {
  if (error.code === 'P0001') {
    const domain = DomainErrorCodeSchema.safeParse(error.message);
    if (domain.success) {
      const { status, code, text } = DOMAIN_ERRORS[domain.data];
      return new HttpError(status, code, text);
    }
  }
  switch (error.code) {
    case '42501':
      return new HttpError(403, 'FORBIDDEN', 'No tenés permiso para hacer esto.');
    case '23505':
      return new HttpError(409, 'CONFLICT', 'Ese registro ya existe.');
    case '23502':
    case '23514':
    case '22P02':
      return new HttpError(400, 'VALIDATION_ERROR', 'Hay datos inválidos en el pedido.');
    default:
      return new HttpError(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  }
}
