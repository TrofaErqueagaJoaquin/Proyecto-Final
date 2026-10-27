import { z } from 'zod';

// Reglas alineadas con supabase/config.toml y con el panel (docs/setup/SUPABASE.md §3):
// mínimo 10 caracteres, con letras y números.
export const PasswordSchema = z
  .string()
  .min(10, 'Usá al menos 10 caracteres.')
  .max(72, 'Usá como máximo 72 caracteres.')
  .regex(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/, 'Incluí al menos una letra.')
  .regex(/\d/, 'Incluí al menos un número.');

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Revisá el correo: no parece válido.'));

export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Escribí tu contraseña.'),
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const SignUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Contanos cómo querés que te llamemos.')
    .max(80, 'Usá como máximo 80 caracteres.'),
  email: EmailSchema,
  password: PasswordSchema,
  acceptTerms: z.literal(true, {
    error: 'Necesitamos que aceptes los términos y la política de privacidad.',
  }),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const RequestPasswordResetSchema = z.object({ email: EmailSchema });
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;

export const NewPasswordSchema = z
  .object({ password: PasswordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden.',
  });
export type NewPasswordInput = z.infer<typeof NewPasswordSchema>;

/** Versión vigente de términos y privacidad (consents.policy_version, formato AAAA-MM-DD). */
export const CURRENT_POLICY_VERSION = '2026-10-27';
