import type { Context, MiddlewareHandler } from 'hono';

import type { AuthorizationPort } from '../auth/authorization';
import type { TokenVerifier } from '../auth/verify-token';
import { errorResponse } from '../lib/http';
import type { AppBindings } from '../types';

/** Exige un JWT válido de Supabase. Ocultar un botón en la app no reemplaza esto. */
export function requireAuth(verify: TokenVerifier): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!token) {
      return errorResponse(c, 401, 'UNAUTHORIZED', 'Iniciá sesión para continuar.');
    }
    try {
      c.set('auth', await verify(token));
    } catch {
      return errorResponse(c, 401, 'UNAUTHORIZED', 'La sesión no es válida o venció.');
    }
    await next();
    return undefined;
  };
}

/**
 * Exige un permiso administrativo. Con `mfa: true`, además exige una sesión con segundo
 * factor (aal2), como piden las operaciones administrativas (ROLES_AND_PERMISSIONS.md §2).
 */
export function requirePermission(
  authorization: AuthorizationPort,
  permission: string,
  options: { mfa?: boolean } = {},
): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const auth = c.get('auth');
    // Primero el permiso: a quien no lo tiene no se le revela qué más exige la ruta.
    if (!(await authorization.hasPermission(auth, permission))) {
      return errorResponse(c, 403, 'FORBIDDEN', 'No tenés permiso para hacer esto.');
    }
    if (options.mfa && auth.aal !== 'aal2') {
      return errorResponse(
        c,
        403,
        'MFA_REQUIRED',
        'Esta acción requiere verificación en dos pasos.',
      );
    }
    await next();
    return undefined;
  };
}

/** Exige ser adulto de la familia indicada en la ruta, con alguno de los roles permitidos. */
export function requireFamilyRole(
  authorization: AuthorizationPort,
  roles: readonly ('owner' | 'guardian' | 'caregiver')[],
  getFamilyId: (c: Context<AppBindings>) => string | undefined = (c) => c.req.param('familyId'),
): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const familyId = getFamilyId(c);
    // 404 y no 403: no se revela si la familia existe.
    if (!familyId || !(await authorization.isFamilyAdult(c.get('auth'), familyId, roles))) {
      return errorResponse(c, 404, 'NOT_FOUND', 'El recurso no existe.');
    }
    await next();
    return undefined;
  };
}
