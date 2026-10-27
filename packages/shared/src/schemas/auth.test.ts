import { describe, expect, it } from 'vitest';

import { NewPasswordSchema, PasswordSchema, SignUpSchema } from './auth';

describe('PasswordSchema', () => {
  it.each(['corta1', 'sinnumerosaqui', '1234567890'])('rechaza "%s"', (value) => {
    expect(PasswordSchema.safeParse(value).success).toBe(false);
  });

  it('acepta una contraseña con letras y números de 10+ caracteres', () => {
    expect(PasswordSchema.safeParse('crecer2026casa').success).toBe(true);
  });
});

describe('SignUpSchema', () => {
  const valid = {
    displayName: ' Laura ',
    email: ' Laura@Ejemplo.COM ',
    password: 'crecer2026casa',
    acceptTerms: true,
  };

  it('normaliza el correo y el nombre', () => {
    const parsed = SignUpSchema.parse(valid);
    expect(parsed.email).toBe('laura@ejemplo.com');
    expect(parsed.displayName).toBe('Laura');
  });

  it('exige aceptar los términos', () => {
    const result = SignUpSchema.safeParse({ ...valid, acceptTerms: false });
    expect(result.success).toBe(false);
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
