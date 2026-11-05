import { describe, expect, it } from 'vitest';

import { NewPasswordSchema, PasswordSchema, SignUpSchema } from './auth';

describe('PasswordSchema', () => {
  it.each(['corta1', 'sinnumerosaqui', '12345678'])('rechaza "%s"', (value) => {
    expect(PasswordSchema.safeParse(value).success).toBe(false);
  });

  it('acepta una contraseña con letras y números de 8+ caracteres', () => {
    expect(PasswordSchema.safeParse('crecer26').success).toBe(true);
  });
});

describe('SignUpSchema', () => {
  it('pide solo correo y contraseña, y normaliza el correo', () => {
    const parsed = SignUpSchema.parse({ email: ' Laura@Ejemplo.COM ', password: 'crecer26' });
    expect(parsed).toEqual({ email: 'laura@ejemplo.com', password: 'crecer26' });
  });
});

describe('NewPasswordSchema', () => {
  it('exige que la confirmación coincida', () => {
    const result = NewPasswordSchema.safeParse({
      password: 'crecer2026casa',
      confirm: 'otra2026casa',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirm']);
  });
});
