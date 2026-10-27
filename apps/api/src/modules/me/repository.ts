import { FamilyRoleSchema, ThemePrefSchema, type MeResponse } from '@crecer/shared';
import { z } from 'zod';

import type { Env } from '../../env';
import { toHttpError } from '../../lib/db-errors';
import { createUserClient } from '../../lib/supabase';
import type { AuthContext } from '../../types';

export type LoadMe = (auth: AuthContext) => Promise<MeResponse>;

const ProfileRow = z.object({ display_name: z.string(), theme_pref: ThemePrefSchema });
const RoleRows = z.array(z.object({ role_code: z.string() }));
const PermissionRows = z.array(z.object({ permission_code: z.string() }));
const MembershipRows = z.array(
  z.object({
    role: FamilyRoleSchema,
    families: z.object({ id: z.uuid(), name: z.string() }),
  }),
);

/** Todo se lee con el JWT de la persona: RLS garantiza que solo vea lo propio. */
export function createSupabaseMeRepository(env: Env): LoadMe {
  return async (auth) => {
    const db = createUserClient(env, auth.token);

    const [profile, roles, memberships] = await Promise.all([
      db.from('profiles').select('display_name, theme_pref').eq('id', auth.userId).single(),
      db.from('user_roles').select('role_code').eq('user_id', auth.userId),
      db
        .from('family_memberships')
        .select('role, families (id, name)')
        .eq('user_id', auth.userId)
        .order('created_at'),
    ]);
    for (const result of [profile, roles, memberships]) {
      if (result.error) throw toHttpError(result.error);
    }

    const roleCodes = RoleRows.parse(roles.data).map((r) => r.role_code);
    let permissions: string[] = [];
    if (roleCodes.length > 0) {
      const result = await db
        .from('role_permissions')
        .select('permission_code')
        .in('role_code', roleCodes);
      if (result.error) throw toHttpError(result.error);
      permissions = [
        ...new Set(PermissionRows.parse(result.data).map((p) => p.permission_code)),
      ].sort();
    }

    const profileRow = ProfileRow.parse(profile.data);
    return {
      userId: auth.userId,
      email: auth.email,
      aal: auth.aal,
      profile: { displayName: profileRow.display_name, themePref: profileRow.theme_pref },
      permissions,
      families: MembershipRows.parse(memberships.data).map((m) => ({
        id: m.families.id,
        name: m.families.name,
        role: m.role,
      })),
    };
  };
}
