import { z } from 'zod';

// Reglas alineadas con supabase/config.toml y con el panel (docs/setup/SUPABASE.md §3):
// mínimo 8 caracteres, con letras y números (el rediseño de 2026 bajó de 10 a 8 para no frenar
// el registro).
export const PasswordSchema = z
  .string()
  .min(8, 'Usá al menos 8 caracteres.')
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

/**
 * Registro mínimo: correo y contraseña. El nombre sale del correo (se cambia en Perfil) y los
 * términos se aceptan en la bienvenida, junto con los datos del primer integrante.
 */
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
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
