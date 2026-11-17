import { adminNav } from './nav';

describe('adminNav', () => {
  it('siempre ofrece "Mi cuenta" (a /perfil, no a /hoy, que rebota a quien no tiene familia)', () => {
    const items = adminNav(new Set());
    expect(items.map((i) => i.href)).toEqual(['/admin', '/perfil']);
    expect(items.at(-1)?.label).toBe('Mi cuenta');
  });

  it('muestra Contenidos también en el celular', () => {
    const contenidos = adminNav(new Set(['content.edit'])).find(
      (i) => i.href === '/admin/contenidos',
    );
    expect(contenidos?.wideOnly).toBeUndefined();
  });
});
