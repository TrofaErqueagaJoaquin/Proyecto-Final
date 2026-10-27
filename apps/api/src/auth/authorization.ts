import type { Env } from '../env';
import { toHttpError } from '../lib/db-errors';
import { createUserClient } from '../lib/supabase';
import type { AuthContext } from '../types';

/**
 * Consultas de autorización. Se resuelven en la base con el JWT de la persona (las mismas
 * funciones que usan las políticas RLS), así la API y RLS nunca discrepan.
 */
export interface AuthorizationPort {
  hasPermission(auth: AuthContext, permission: string): Promise<boolean>;
  isFamilyAdult(auth: AuthContext, familyId: string, roles?: readonly string[]): Promise<boolean>;
}

export function createSupabaseAuthorization(env: Env): AuthorizationPort {
  return {
    async hasPermission(auth, permission) {
      const result = await createUserClient(env, auth.token).rpc('has_permission', {
        p_code: permission,
      });
      if (result.error) throw toHttpError(result.error);
      return result.data;
    },
    async isFamilyAdult(auth, familyId, roles) {
      const result = await createUserClient(env, auth.token).rpc('is_family_adult', {
        p_family_id: familyId,
        // Sin roles = cualquier rol (el parámetro tiene default null en la base).
        p_roles: roles ? [...roles] : undefined,
      });
      if (result.error) throw toHttpError(result.error);
      return result.data;
    },
  };
}
