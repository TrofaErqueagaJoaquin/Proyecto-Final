import { z } from 'zod';

import { FamilyRoleSchema } from '../api/me';
import { EmailSchema } from './auth';

// Catálogos alineados con los CHECK de supabase/migrations/…_families_consents.sql.

export const RELATIONSHIPS = [
  { value: 'madre', label: 'Madre' },
  { value: 'padre', label: 'Padre' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'tutora', label: 'Tutora' },
  { value: 'abuela', label: 'Abuela' },
  { value: 'abuelo', label: 'Abuelo' },
  { value: 'otro', label: 'Otro vínculo' },
] as const;
export const RelationshipSchema = z.enum(
  RELATIONSHIPS.map((r) => r.value) as [string, ...string[]],
  {
    error: 'Elegí tu vínculo con la familia.',
  },
);

export const FAMILY_ROLE_LABELS = {
  owner: 'Responsable principal',
  guardian: 'Responsable',
  caregiver: 'Cuidador/a',
} as const satisfies Record<z.infer<typeof FamilyRoleSchema>, string>;

export const FAMILY_ROLE_DESCRIPTIONS = {
  owner: 'Gestiona todo: integrantes, adultos, profesionales y privacidad.',
  guardian: 'Gestiona integrantes, evaluaciones y profesionales.',
  caregiver: 'Ve el plan y las actividades, y las marca como hechas.',
} as const satisfies Record<z.infer<typeof FamilyRoleSchema>, string>;

/** Intereses (catálogo cerrado: nunca texto libre sobre un menor). */
export const INTERESTS = [
  { value: 'arte', label: 'Arte y dibujo' },
  { value: 'musica', label: 'Música' },
  { value: 'deporte', label: 'Deporte' },
  { value: 'naturaleza', label: 'Naturaleza' },
  { value: 'lectura', label: 'Cuentos y lectura' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'construccion', label: 'Construir y armar' },
  { value: 'animales', label: 'Animales' },
  { value: 'juegos_mesa', label: 'Juegos de mesa' },
  { value: 'baile', label: 'Baile' },
  { value: 'ciencia', label: 'Experimentos' },
  { value: 'disfraces', label: 'Disfraces y juego simbólico' },
] as const;
const INTEREST_VALUES = INTERESTS.map((i) => i.value) as [string, ...string[]];
export const InterestSchema = z.enum(INTEREST_VALUES);

export const CreateFamilySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Poné un nombre para tu familia.')
    .max(80, 'Usá como máximo 80 caracteres.'),
  relationship: RelationshipSchema,
});
export type CreateFamilyInput = z.infer<typeof CreateFamilySchema>;

/**
 * Mes y año de nacimiento escritos como "MM/AAAA" → "AAAA-MM-01" (formato de la columna date).
 * Solo se guarda el mes (minimización de datos).
 */
export function parseBirthMonth(value: string, now: Date): string | null {
  const match = /^\s*(0?[1-9]|1[0-2])\s*\/\s*(\d{4})\s*$/.exec(value);
  if (!match?.[1] || !match[2]) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (year < 1990) return null;
  const currentIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  if (year * 12 + (month - 1) > currentIndex) return null;
  return `${String(year)}-${String(month).padStart(2, '0')}-01`;
}

/** "AAAA-MM-01" → "MM/AAAA" (para editar). */
export function formatBirthMonth(isoDate: string): string {
  const [year, month] = isoDate.split('-');
  return `${month ?? ''}/${year ?? ''}`;
}

export function makeMemberSchema(now: Date) {
  return z.object({
    alias: z.string().trim().min(1, 'Escribí un apodo.').max(40, 'Usá como máximo 40 caracteres.'),
    birthMonth: z.string().refine((value) => parseBirthMonth(value, now) !== null, {
      message: 'Escribí mes y año como MM/AAAA (por ejemplo, 03/2022). No puede ser futuro.',
    }),
    interests: z.array(InterestSchema).max(10, 'Elegí como máximo 10 intereses.'),
  });
}
export type MemberInput = z.infer<ReturnType<typeof makeMemberSchema>>;

export const InvitationRoleSchema = FamilyRoleSchema;
export const CreateInvitationSchema = z.object({
  email: EmailSchema,
  role: InvitationRoleSchema,
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

export const CreateInvitationResponseSchema = z.object({
  invitationId: z.uuid(),
  expiresAt: z.iso.datetime({ offset: true }),
  /** Enlace para compartir (WhatsApp, correo). Solo lo recibe quien invita. */
  inviteUrl: z.url(),
  emailSent: z.boolean(),
});
export type CreateInvitationResponse = z.infer<typeof CreateInvitationResponseSchema>;

export const PreferencesSchema = z.object({
  minutesPerDay: z.number().int().min(0).max(600).nullable(),
  space: z.enum(['small_indoor', 'indoor', 'outdoor']).nullable(),
  budget: z.enum(['free', 'low', 'medium']).nullable(),
  interests: z.array(InterestSchema).max(15),
});
export type PreferencesInput = z.infer<typeof PreferencesSchema>;
