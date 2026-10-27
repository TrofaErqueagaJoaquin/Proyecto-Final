// Textos del módulo de profesionales. Lo que se comparte siempre se explica en lenguaje claro
// (UX_AND_NAVIGATION.md §1.6: qué, con quién y cómo se revoca).

export const MEMBER_SCOPES = [
  'member_profile',
  'assessments',
  'goals',
  'activities',
  'observations',
] as const;
export const FAMILY_SCOPES = ['family_goals', 'family_plans'] as const;
export type MemberScope = (typeof MEMBER_SCOPES)[number];
export type FamilyScope = (typeof FAMILY_SCOPES)[number];
export type Scope = MemberScope | FamilyScope;

export const SCOPE_LABELS: Record<Scope, { label: string; description: string }> = {
  member_profile: {
    label: 'Perfil',
    description: 'Apodo, edad e intereses. Es necesario para compartir cualquier otra cosa.',
  },
  assessments: {
    label: 'Evaluaciones',
    description: 'Los resultados de las evaluaciones de hábitos y su historial.',
  },
  goals: {
    label: 'Objetivos',
    description: 'Ver los objetivos, proponer nuevos y anotar avances.',
  },
  activities: {
    label: 'Actividades',
    description: 'Las actividades que hicieron con este integrante.',
  },
  observations: {
    label: 'Observaciones',
    description:
      'Que pueda anotar observaciones. Ustedes ven solo las que el profesional decida compartir.',
  },
  family_goals: {
    label: 'Objetivos de la familia',
    description: 'Objetivos para toda la familia, no de un integrante en particular.',
  },
  family_plans: {
    label: 'Planes de la familia',
    description: 'Los planes semanales de actividades.',
  },
};

export const VERIFICATION_LABELS = {
  unverified: 'Credenciales declaradas, no verificadas',
  pending: 'Verificación en curso',
  verified: 'Credenciales verificadas',
  rejected: 'Verificación rechazada',
  expired: 'Verificación vencida',
} as const;
export type VerificationStatus = keyof typeof VERIFICATION_LABELS;

export const CARE_STATUS_LABELS = {
  requested: 'Solicitud enviada',
  active: 'Acompañamiento activo',
  rejected: 'Solicitud rechazada',
  cancelled: 'Solicitud cancelada',
  ended: 'Acompañamiento finalizado',
} as const;
export type CareStatus = keyof typeof CARE_STATUS_LABELS;

export const CREDENTIAL_STATUS_LABELS = {
  declared: 'Declarada',
  submitted: 'Enviada a verificar',
  verified: 'Verificada',
  rejected: 'Rechazada',
  expired: 'Vencida',
} as const;
export type CredentialStatus = keyof typeof CREDENTIAL_STATUS_LABELS;

export const CREDENTIAL_KIND_LABELS = {
  license: 'Matrícula',
  degree: 'Título',
  other: 'Otra',
} as const;

export const MODALITY_LABELS = { presencial: 'Presencial', virtual: 'Virtual' } as const;
export type Modality = keyof typeof MODALITY_LABELS;

export const GOAL_STATUS_LABELS = {
  active: 'En curso',
  achieved: 'Logrado',
  paused: 'En pausa',
  dropped: 'Dejado de lado',
} as const;
export type GoalStatus = keyof typeof GOAL_STATUS_LABELS;

/** Lo que un integrante tiene elegido para compartir en el asistente de 3 pasos. */
export type ShareSelection = Record<string, MemberScope[]>;

/**
 * Activa o desactiva un alcance de un integrante. Sin "Perfil" no se comparte nada más
 * (ROLES_AND_PERMISSIONS.md §4 regla 2): elegir otro alcance suma el perfil, y quitar el
 * perfil quita todo lo de ese integrante.
 */
export function toggleScope(current: MemberScope[], scope: MemberScope): MemberScope[] {
  const has = current.includes(scope);
  if (scope === 'member_profile') return has ? [] : ['member_profile'];
  const next = has ? current.filter((s) => s !== scope) : [...current, scope];
  return next.length > 0 && !next.includes('member_profile') ? ['member_profile', ...next] : next;
}

/** Arma el `p_grants` de request_care (sin integrantes vacíos). */
export function toGrants(
  selection: ShareSelection,
  familyScopes: FamilyScope[],
): { member_id: string | null; scopes: string[] }[] {
  const grants: { member_id: string | null; scopes: string[] }[] = Object.entries(selection)
    .filter(([, scopes]) => scopes.length > 0)
    .map(([memberId, scopes]) => ({
      member_id: memberId,
      scopes: MEMBER_SCOPES.filter((s) => scopes.includes(s)),
    }));
  if (familyScopes.length > 0) grants.push({ member_id: null, scopes: [...familyScopes] });
  return grants;
}

/** "6 años y 8 meses" · "8 meses". */
export function ageLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years === 1 ? '1 año' : `${String(years)} años`;
  const m = rest === 1 ? '1 mes' : `${String(rest)} meses`;
  if (years === 0) return m;
  return rest === 0 ? y : `${y} y ${m}`;
}
