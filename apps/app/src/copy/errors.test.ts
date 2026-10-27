import { ApiError } from '@/lib/api';

import { friendlyError } from './errors';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('friendlyError', () => {
  it('traduce errores de Supabase Auth por código', () => {
    expect(
      friendlyError({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
    ).toBe('El correo o la contraseña no son correctos.');
  });

  it('no revela si un correo ya está registrado', () => {
    expect(friendlyError({ code: 'user_already_exists' })).not.toMatch(/ya existe|registrad/i);
  });

  it('usa el mensaje de la API para sus errores de dominio', () => {
    expect(friendlyError(new ApiError(409, 'CONFLICT', 'Ya sos parte de esta familia.'))).toBe(
      'Ya sos parte de esta familia.',
    );
  });

  it('traduce la falta de conexión', () => {
    expect(friendlyError(new ApiError(0, 'SERVICE_UNAVAILABLE', 'x'))).toMatch(/conexión/);
  });

  it('nunca muestra mensajes técnicos desconocidos', () => {
    expect(friendlyError(new Error('relation "profiles" does not exist'))).not.toMatch(/relation/);
  });

  it('traduce errores de dominio de la base (P0001)', () => {
    expect(friendlyError({ code: 'P0001', message: 'LAST_FAMILY_OWNER' })).toMatch(
      /al menos un responsable principal/,
    );
  });

  it('traduce violaciones de permisos de RLS', () => {
    expect(friendlyError({ code: '42501', message: 'new row violates row-level security' })).toBe(
      'No tenés permiso para hacer esto.',
    );
  });
});
