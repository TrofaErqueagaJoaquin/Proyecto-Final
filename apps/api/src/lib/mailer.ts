import { log } from './logger';

export interface InvitationEmail {
  to: string;
  inviteUrl: string;
  familyName: string;
}

export interface Mailer {
  /** Devuelve true si el correo se envió; false si no hay un proveedor configurado. */
  sendInvitation(email: InvitationEmail): Promise<boolean>;
}

/** Sin proveedor de correo: la persona comparte el enlace a mano (por WhatsApp, por ejemplo). */
export const disabledMailer: Mailer = {
  sendInvitation: () => Promise.resolve(false),
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Envío con Resend (https://resend.com/docs/api-reference/emails/send-email). */
export function createResendMailer(apiKey: string, from: string): Mailer {
  return {
    async sendInvitation({ to, inviteUrl, familyName }) {
      const subject = `Te invitaron a "${familyName}" en Crecer en Casa`;
      const text = [
        `Te invitaron a sumarte al espacio de la familia "${familyName}" en Crecer en Casa.`,
        '',
        `Para aceptar, abrí este enlace (vence en 7 días): ${inviteUrl}`,
        '',
        'Si no esperabas esta invitación, podés ignorar este correo.',
      ].join('\n');
      const html = `<p>Te invitaron a sumarte al espacio de la familia <strong>${escapeHtml(familyName)}</strong> en Crecer en Casa.</p><p><a href="${escapeHtml(inviteUrl)}">Aceptar la invitación</a> (vence en 7 días).</p><p>Si no esperabas esta invitación, podés ignorar este correo.</p>`;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text, html }),
      });
      if (!response.ok) {
        log('warn', 'resend_error', { status: response.status });
        return false;
      }
      return true;
    },
  };
}
