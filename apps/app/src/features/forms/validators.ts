import { EmailSchema } from '@crecer/shared';

/**
 * Reglas de los campos que no usan un esquema de react-hook-form. Cada una devuelve el mensaje de
 * error (en el tono de la app) o `undefined` si el valor está bien. Los campos opcionales vacíos
 * siempre están bien.
 */

const LETTER = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
const PLACE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

/** Apodo de un integrante: obligatorio, con alguna letra, hasta 40 caracteres. */
export function aliasError(value: string): string | undefined {
  const v = value.trim();
  if (v === '') return 'Contanos cómo le decís.';
  if (!LETTER.test(v)) return 'Usá al menos una letra.';
  if (v.length > 40) return 'Usá como máximo 40 caracteres.';
  return undefined;
}

/** Nombre visible (profesional, perfil): obligatorio, de 3 a 80 caracteres, con letras. */
export function displayNameError(value: string): string | undefined {
  const v = value.trim();
  if (v.length < 3) return 'Escribí tu nombre como querés que lo vean (al menos 3 letras).';
  if (!LETTER.test(v)) return 'Usá letras en el nombre.';
  if (v.length > 80) return 'Usá como máximo 80 caracteres.';
  return undefined;
}

/** Ciudad o provincia (opcional): solo letras, espacios, puntos, guiones y apóstrofos. */
export function placeError(value: string): string | undefined {
  const v = value.trim();
  if (v === '') return undefined;
  if (!PLACE.test(v)) return 'Usá solo letras (sin números ni símbolos).';
  return undefined;
}

/** Contacto público (opcional): un correo válido o un teléfono de 8 a 15 dígitos. */
export function contactError(value: string): string | undefined {
  const v = value.trim();
  if (v === '') return undefined;
  // El correo se valida igual que en el registro (mismo esquema compartido).
  if (v.includes('@'))
    return EmailSchema.safeParse(v).success ? undefined : 'Revisá el correo: no parece válido.';
  const digits = v.replace(/\D/g, '');
  if (!/^[\d\s()+-]+$/.test(v) || digits.length < 8 || digits.length > 15) {
    return 'Escribí un correo o un teléfono con característica (8 a 15 números).';
  }
  return undefined;
}

/** Texto obligatorio con un mínimo de caracteres (objetivos, profesión, etc.). */
export function requiredError(value: string, min: number, message: string): string | undefined {
  return value.trim().length < min ? message : undefined;
}

/** Código de 6 dígitos de la app autenticadora. */
export function otpError(value: string): string | undefined {
  return /^\d{6}$/.test(value) ? undefined : 'El código tiene 6 números.';
}
