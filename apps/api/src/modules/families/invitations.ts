import { createHash, randomBytes } from 'node:crypto';

import {
  CreateInvitationSchema,
  type CreateInvitationInput,
  type CreateInvitationResponse,
} from '@crecer/shared';
import { Hono } from 'hono';

import type { AuthorizationPort } from '../../auth/authorization';
import type { Env } from '../../env';
import { toHttpError } from '../../lib/db-errors';
import { errorResponse, HttpError } from '../../lib/http';
import { log } from '../../lib/logger';
import type { Mailer } from '../../lib/mailer';
import { createUserClient } from '../../lib/supabase';
import { requireFamilyRole } from '../../middleware/auth';
import type { AppBindings, AuthContext } from '../../types';

const INVITATION_TTL_DAYS = 7;

export interface NewInvitation {
  familyId: string;
  email: string;
  role: CreateInvitationInput['role'];
  /** Hash SHA-256 del token en hexadecimal: el token nunca se guarda. */
  tokenHashHex: string;
  expiresAt: Date;
}

export interface InvitationsPort {
  create(auth: AuthContext, invitation: NewInvitation): Promise<{ id: string; familyName: string }>;
}

/** Token aleatorio (256 bits) apto para URL. */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Mismo cálculo que accept_family_invitation(): sha256 del token en UTF-8. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Inserta con el JWT de quien invita: RLS decide si puede invitar ese rol (owner/guardian). */
export function createSupabaseInvitations(env: Env): InvitationsPort {
  return {
    async create(auth, invitation) {
      const db = createUserClient(env, auth.token);
      const family = await db
        .from('families')
        .select('name')
        .eq('id', invitation.familyId)
        .single();
      if (family.error) throw toHttpError(family.error);

      const result = await db
        .from('family_invitations')
        .insert({
          family_id: invitation.familyId,
          email: invitation.email,
          role: invitation.role,
          token_hash: `\\x${invitation.tokenHashHex}`,
          invited_by: auth.userId,
          expires_at: invitation.expiresAt.toISOString(),
        })
        .select('id')
        .single();
      if (result.error) {
        if (result.error.code === '23505') {
          throw new HttpError(409, 'CONFLICT', 'Ya hay una invitación pendiente para ese correo.');
        }
        throw toHttpError(result.error);
      }
      return { id: result.data.id, familyName: family.data.name };
    },
  };
}

export interface InvitationRouteDeps {
  authorization: AuthorizationPort;
  invitations: InvitationsPort;
  mailer: Mailer;
  now: () => Date;
  generateToken: () => string;
  appPublicUrl: string;
}

export function invitationsRoute(deps: InvitationRouteDeps) {
  const route = new Hono<AppBindings>();

  route.post(
    '/v1/families/:familyId/invitations',
    requireFamilyRole(deps.authorization, ['owner', 'guardian']),
    async (c) => {
      const parsed = CreateInvitationSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) {
        return errorResponse(c, 400, 'VALIDATION_ERROR', 'Revisá el correo y el rol.');
      }
      const auth = c.get('auth');
      const familyId = c.req.param('familyId');
      const token = deps.generateToken();
      const expiresAt = new Date(deps.now().getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

      const created = await deps.invitations.create(auth, {
        familyId,
        email: parsed.data.email,
        role: parsed.data.role,
        tokenHashHex: hashInvitationToken(token),
        expiresAt,
      });

      const inviteUrl = `${deps.appPublicUrl}/invitacion?token=${encodeURIComponent(token)}`;
      let emailSent = false;
      try {
        emailSent = await deps.mailer.sendInvitation({
          to: parsed.data.email,
          inviteUrl,
          familyName: created.familyName,
        });
      } catch (error) {
        // El correo es un extra: la invitación ya existe y el enlace se puede compartir a mano.
        log('warn', 'invitation_email_failed', {
          requestId: c.get('requestId'),
          error: error instanceof Error ? error.message : 'desconocido',
        });
      }

      const body: CreateInvitationResponse = {
        invitationId: created.id,
        expiresAt: expiresAt.toISOString(),
        inviteUrl,
        emailSent,
      };
      return c.json(body, 201);
    },
  );

  return route;
}
