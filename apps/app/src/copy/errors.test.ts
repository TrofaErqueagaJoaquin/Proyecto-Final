import { ApiError } from '@/lib/api';

import {
  errorKind,
  friendlyError,
  isNetworkError,
  isSessionError,
  NETWORK_MESSAGE,
} from './errors';

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

  it('reconoce la falta de internet en fetch, Supabase y la API', () => {
    const casos: unknown[] = [
      new TypeError('Network request failed'),
      new TypeError('Failed to fetch'),
      { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' },
      Object.assign(new Error('x'), { name: 'AuthRetryableFetchError', status: 0 }),
      new ApiError(0, 'SERVICE_UNAVAILABLE', 'x'),
    ];
    for (const error of casos) {
      expect(isNetworkError(error)).toBe(true);
      expect(friendlyError(error)).toBe(NETWORK_MESSAGE);
      expect(errorKind(error)).toBe('offline');
    }
  });

  it('un servicio caído no se confunde con falta de internet', () => {
    const error = new ApiError(503, 'SERVICE_UNAVAILABLE', 'x');
    expect(isNetworkError(error)).toBe(false);
    expect(friendlyError(error)).toMatch(/en un rato/);
  });

  it('reconoce la sesión vencida', () => {
    const casos: unknown[] = [
      new ApiError(401, 'UNAUTHORIZED', 'x'),
      { code: 'P0001', message: 'NOT_AUTHENTICATED' },
      { code: 'refresh_token_not_found', message: 'x' },
      Object.assign(new Error('Auth session missing!'), { name: 'AuthSessionMissingError' }),
    ];
    for (const error of casos) {
      expect(isSessionError(error)).toBe(true);
      expect(errorKind(error)).toBe('session');
      expect(friendlyError(error)).toMatch(/sesión venció/);
    }
  });

  it('el resto es un error común', () => {
    expect(errorKind(new Error('boom'))).toBe('other');
    expect(errorKind({ code: '42501' })).toBe('other');
    expect(errorKind(undefined)).toBe('other');
  });
});
