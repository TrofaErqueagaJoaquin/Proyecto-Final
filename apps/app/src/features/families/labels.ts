import { ageInMonths, formatAge } from '@crecer/domain';
import { FAMILY_ROLE_LABELS, INTERESTS, RELATIONSHIPS, type FamilyRole } from '@crecer/shared';

const INTEREST_LABELS = new Map<string, string>(INTERESTS.map((i) => [i.value, i.label]));
const RELATIONSHIP_LABELS = new Map<string, string>(RELATIONSHIPS.map((r) => [r.value, r.label]));

export function interestLabel(value: string): string {
  return INTEREST_LABELS.get(value) ?? value;
}

export function relationshipLabel(value: string): string {
  return RELATIONSHIP_LABELS.get(value) ?? value;
}

export function roleLabel(role: string): string {
  return FAMILY_ROLE_LABELS[role as FamilyRole] ?? role;
}

/** "4 años y 2 meses" a partir de la columna birth_month ("AAAA-MM-01"). */
export function memberAge(birthMonth: string, now: Date = new Date()): string {
  try {
    return formatAge(ageInMonths(birthMonth, now));
  } catch {
    return 'edad no disponible';
  }
}

export const CONSENT_LABELS: Record<string, string> = {
  terms_privacy: 'Términos y política de privacidad',
  chat_history: 'Guardar el historial del asistente',
  child_data: 'Datos del integrante',
  ai_personal_context: 'Usar el contexto de la familia en el asistente',
  professional_access: 'Acceso de un profesional',
};
