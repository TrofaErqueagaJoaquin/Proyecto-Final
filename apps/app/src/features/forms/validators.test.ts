import {
  aliasError,
  contactError,
  displayNameError,
  otpError,
  placeError,
  requiredError,
} from './validators';

describe('validadores de campos', () => {
  it('apodo', () => {
    expect(aliasError('')).toBeDefined();
    expect(aliasError('123')).toBeDefined();
    expect(aliasError('a'.repeat(41))).toBeDefined();
    expect(aliasError('Tomi')).toBeUndefined();
  });

  it('nombre visible', () => {
    expect(displayNameError('Al')).toBeDefined();
    expect(displayNameError('1234')).toBeDefined();
    expect(displayNameError('Lic. Paula Ríos')).toBeUndefined();
  });

  it('ciudad o provincia (opcional)', () => {
    expect(placeError('')).toBeUndefined();
    expect(placeError('Mar del Plata')).toBeUndefined();
    expect(placeError("Villa Gesell-Pinamar O'Higgins")).toBeUndefined();
    expect(placeError('Mar del Plata 123')).toBeDefined();
  });

  it('contacto: correo o teléfono', () => {
    expect(contactError('')).toBeUndefined();
    expect(contactError('consultorio@ejemplo.com')).toBeUndefined();
    expect(contactError('+54 223 555-1234')).toBeUndefined();
    expect(contactError('consultorio@')).toBeDefined();
    expect(contactError('1234')).toBeDefined();
    expect(contactError('llamar a la tarde')).toBeDefined();
  });

  it('obligatorio y código', () => {
    expect(requiredError('  ab ', 3, 'falta')).toBe('falta');
    expect(requiredError('abc', 3, 'falta')).toBeUndefined();
    expect(otpError('12345')).toBeDefined();
    expect(otpError('123456')).toBeUndefined();
  });
});
