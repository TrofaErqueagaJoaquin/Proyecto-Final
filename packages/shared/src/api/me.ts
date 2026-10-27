import { z } from 'zod';

export const FamilyRoleSchema = z.enum(['owner', 'guardian', 'caregiver']);
export type FamilyRole = z.infer<typeof FamilyRoleSchema>;

export const ThemePrefSchema = z.enum(['system', 'light', 'dark']);

/** GET /v1/me: quién soy y en qué espacios puedo moverme (ROLES_AND_PERMISSIONS.md §1). */
export const MeResponseSchema = z.object({
  userId: z.uuid(),
  email: z.string().nullable(),
  /** Nivel de autenticación de la sesión: aal2 = con segundo factor (MFA). */
  aal: z.enum(['aal1', 'aal2']),
  profile: z.object({
    displayName: z.string(),
    themePref: ThemePrefSchema,
  }),
  permissions: z.array(z.string()),
  families: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      role: FamilyRoleSchema,
    }),
  ),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
