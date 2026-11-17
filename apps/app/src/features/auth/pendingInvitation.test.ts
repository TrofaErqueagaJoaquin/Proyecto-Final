import {
  clearPendingInvitation,
  isInvitationPath,
  readPendingInvitation,
  rememberInvitation,
  withNext,
} from './pendingInvitation';

const mockMemory = new Map<string, string>();
jest.mock('@/lib/storage', () => ({
  storage: {
    getItem: (key: string) => Promise.resolve(mockMemory.get(key) ?? null),
    setItem: (key: string, value: string) => {
      mockMemory.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      mockMemory.delete(key);
      return Promise.resolve();
    },
  },
}));

const INVITATION = '/invitacion?token=abc123';

beforeEach(() => {
  mockMemory.clear();
  jest.restoreAllMocks();
});

describe('isInvitationPath', () => {
  it('reconoce solo el destino de una invitación', () => {
    expect(isInvitationPath(INVITATION)).toBe(true);
    expect(isInvitationPath('/invitacion')).toBe(true);
    expect(isInvitationPath('/invitaciones')).toBe(false);
    expect(isInvitationPath('/hoy')).toBe(false);
    expect(isInvitationPath(undefined)).toBe(false);
  });
});

describe('withNext', () => {
  it('agrega `next` codificado, con ? o con &', () => {
    expect(withNext('/registrarse', INVITATION)).toBe(
      '/registrarse?next=%2Finvitacion%3Ftoken%3Dabc123',
    );
    expect(withNext('/callback?tipo=confirmacion', INVITATION)).toBe(
      '/callback?tipo=confirmacion&next=%2Finvitacion%3Ftoken%3Dabc123',
    );
  });

  it('no agrega destinos externos ni vacíos', () => {
    expect(withNext('/ingresar', 'https://otro.sitio')).toBe('/ingresar');
    expect(withNext('/ingresar', '//otro.sitio')).toBe('/ingresar');
    expect(withNext('/ingresar', undefined)).toBe('/ingresar');
  });
});

describe('invitación pendiente', () => {
  it('guarda solo invitaciones y las devuelve hasta que se olvidan', async () => {
    await rememberInvitation('/hoy');
    expect(await readPendingInvitation()).toBeNull();

    await rememberInvitation(INVITATION);
    expect(await readPendingInvitation()).toBe(INVITATION);

    await clearPendingInvitation();
    expect(await readPendingInvitation()).toBeNull();
  });

  it('una invitación de hace más de 7 días ya no se retoma', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now - 8 * 24 * 60 * 60 * 1000);
    await rememberInvitation(INVITATION);
    jest.spyOn(Date, 'now').mockReturnValue(now);
    expect(await readPendingInvitation()).toBeNull();
    expect(mockMemory.size).toBe(0);
  });

  it('un valor roto se ignora', async () => {
    mockMemory.set('crecer.invitacionPendiente', 'no es json');
    expect(await readPendingInvitation()).toBeNull();
  });
});
