import { Hono } from 'hono';
import { z } from 'zod';

import type { AuthorizationPort } from '../../auth/authorization';
import type { Env } from '../../env';
import { toHttpError } from '../../lib/db-errors';
import { errorResponse } from '../../lib/http';
import { createServiceClient } from '../../lib/supabase';
import { requirePermission } from '../../middleware/auth';
import type { AppBindings } from '../../types';

// Operaciones administrativas que necesitan la clave secreta (Storage privado, verify_credential,
// user_roles). Siempre después de verificar el permiso Y el segundo factor (ROLES §7).

export const ROLE_CODES = [
  'platform_admin',
  'content_editor',
  'content_publisher',
  'credential_verifier',
  'auditor',
] as const;

const VerifySchema = z.object({
  result: z.enum(['verified', 'rejected', 'needs_info']),
  method: z.enum(['refeps', 'colegio', 'manual']),
  note: z.string().trim().max(500).optional(),
  validUntil: z.iso.date().optional(),
});
const RoleSchema = z.object({ role: z.enum(ROLE_CODES) });
const Uuid = z.uuid();

export interface AdminPort {
  /** URL firmada de 60 s para el archivo de la credencial. */
  credentialDocumentUrl(
    credentialId: string,
  ): Promise<{ status: 'ok'; url: string } | { status: 'not_found' } | { status: 'no_file' }>;
  verifyCredential(input: {
    credentialId: string;
    verifierId: string;
    result: 'verified' | 'rejected' | 'needs_info';
    method: 'refeps' | 'colegio' | 'manual';
    note: string | null;
    validUntil: string | null;
  }): Promise<void>;
  grantRole(userId: string, role: string, grantedBy: string): Promise<void>;
  revokeRole(userId: string, role: string): Promise<void>;
}

export function createSupabaseAdmin(env: Env): AdminPort {
  const service = () => createServiceClient(env);
  return {
    async credentialDocumentUrl(credentialId) {
      const db = service();
      const credential = await db
        .from('professional_credentials')
        .select('document_path')
        .eq('id', credentialId)
        .maybeSingle();
      if (credential.error) throw toHttpError(credential.error);
      if (!credential.data) return { status: 'not_found' };
      if (!credential.data.document_path) return { status: 'no_file' };
      const signed = await db.storage
        .from('credentials')
        .createSignedUrl(credential.data.document_path, 60);
      if (signed.error) throw new Error('No se pudo firmar la URL del archivo');
      return { status: 'ok', url: signed.data.signedUrl };
    },
    async verifyCredential(input) {
      const result = await service().rpc('verify_credential', {
        p_credential: input.credentialId,
        p_verifier: input.verifierId,
        p_method: input.method,
        p_result: input.result,
        ...(input.note ? { p_note: input.note } : {}),
        ...(input.validUntil ? { p_valid_until: input.validUntil } : {}),
      });
      if (result.error) throw toHttpError(result.error);
    },
    async grantRole(userId, role, grantedBy) {
      const result = await service()
        .from('user_roles')
        .upsert(
          { user_id: userId, role_code: role, granted_by: grantedBy },
          { onConflict: 'user_id,role_code', ignoreDuplicates: true },
        );
      if (result.error) throw toHttpError(result.error);
    },
    async revokeRole(userId, role) {
      const result = await service()
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_code', role);
      if (result.error) throw toHttpError(result.error);
    },
  };
}

export function adminRoute(deps: { admin: AdminPort; authorization: AuthorizationPort }) {
  const route = new Hono<AppBindings>();
  const verifier = requirePermission(deps.authorization, 'professionals.verify', { mfa: true });
  const roleManager = requirePermission(deps.authorization, 'users.manage_roles', { mfa: true });

  route.post('/v1/admin/credentials/:id/document-url', verifier, async (c) => {
    const id = Uuid.safeParse(c.req.param('id'));
    if (!id.success) return errorResponse(c, 404, 'NOT_FOUND', 'La credencial no existe.');
    const result = await deps.admin.credentialDocumentUrl(id.data);
    if (result.status === 'not_found') {
      return errorResponse(c, 404, 'NOT_FOUND', 'La credencial no existe.');
    }
    if (result.status === 'no_file') {
      return errorResponse(c, 404, 'NOT_FOUND', 'Esta credencial no tiene archivo adjunto.');
    }
    return c.json({ url: result.url, expiresInSeconds: 60 });
  });

  route.post('/v1/admin/credentials/:id/verify', verifier, async (c) => {
    const id = Uuid.safeParse(c.req.param('id'));
    const body = VerifySchema.safeParse(await c.req.json().catch(() => null));
    if (!id.success || !body.success) {
      return errorResponse(c, 400, 'VALIDATION_ERROR', 'Pedido inválido.');
    }
    await deps.admin.verifyCredential({
      credentialId: id.data,
      verifierId: c.get('auth').userId,
      result: body.data.result,
      method: body.data.method,
      note: body.data.note ?? null,
      validUntil: body.data.validUntil ?? null,
    });
    return c.json({ status: 'ok' });
  });

  route.post('/v1/admin/users/:userId/roles', roleManager, async (c) => {
    const userId = Uuid.safeParse(c.req.param('userId'));
    const body = RoleSchema.safeParse(await c.req.json().catch(() => null));
    if (!userId.success || !body.success) {
      return errorResponse(c, 400, 'VALIDATION_ERROR', 'Pedido inválido.');
    }
    await deps.admin.grantRole(userId.data, body.data.role, c.get('auth').userId);
    return c.json({ status: 'ok' });
  });

  route.delete('/v1/admin/users/:userId/roles/:role', roleManager, async (c) => {
    const userId = Uuid.safeParse(c.req.param('userId'));
    const role = RoleSchema.shape.role.safeParse(c.req.param('role'));
    if (!userId.success || !role.success) {
      return errorResponse(c, 400, 'VALIDATION_ERROR', 'Pedido inválido.');
    }
    await deps.admin.revokeRole(userId.data, role.data);
    return c.json({ status: 'ok' });
  });

  return route;
}
