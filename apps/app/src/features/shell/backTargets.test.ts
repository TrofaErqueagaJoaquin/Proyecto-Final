import { activeHref, publicFallback, spaceFallback, type SpaceItem } from './backTargets';

const FAMILY: SpaceItem[] = [
  { href: '/hoy' },
  { href: '/familia' },
  { href: '/mis-actividades' },
  { href: '/evaluaciones', wideOnly: true },
  { href: '/perfil' },
];

const ADMIN: SpaceItem[] = [
  { href: '/admin', exact: true },
  { href: '/admin/usuarios', wideOnly: true },
  { href: '/admin/contenidos', wideOnly: true },
  { href: '/perfil' },
];

describe('spaceFallback', () => {
  it('las secciones visibles no tienen "Volver"', () => {
    for (const { href } of FAMILY.filter((item) => item.wideOnly !== true)) {
      expect(spaceFallback(href, FAMILY, false)).toBeNull();
    }
  });

  it.each([
    ['/evaluaciones/abc/resultado', '/evaluaciones'],
    ['/familia/integrante/123', '/familia'],
    ['/familia/invitar', '/familia'],
  ] as const)('%s vuelve a %s', (pathname, expected) => {
    expect(spaceFallback(pathname, FAMILY, false)).toBe(expected);
  });

  it('una pantalla suelta vuelve a la raíz del espacio', () => {
    expect(spaceFallback('/privacidad', FAMILY, false)).toBe('/hoy');
    // "/familiar" no es una pantalla de "/familia".
    expect(spaceFallback('/familiar', FAMILY, false)).toBe('/hoy');
  });

  it('en el teléfono, una sección solo de escritorio lleva "Volver"; en escritorio, no', () => {
    expect(spaceFallback('/evaluaciones', FAMILY, false)).toBe('/hoy');
    expect(spaceFallback('/evaluaciones', FAMILY, true)).toBeNull();
  });

  it('la raíz del espacio nunca tiene "Volver", aunque no se vea en la barra', () => {
    const demo: SpaceItem[] = [{ href: '/admin/contenidos', wideOnly: true }, { href: '/perfil' }];
    expect(spaceFallback('/admin/contenidos', demo, false)).toBeNull();
  });

  it('el respaldo busca el padre entre todos los ítems, también los ocultos', () => {
    expect(spaceFallback('/admin/contenidos/nueva-actividad', ADMIN, false)).toBe(
      '/admin/contenidos',
    );
    expect(spaceFallback('/admin/otra-cosa', ADMIN, false)).toBe('/admin');
  });
});

describe('activeHref', () => {
  it('marca la sección y sus subrutas', () => {
    expect(activeHref('/familia', FAMILY, false)).toBe('/familia');
    expect(activeHref('/familia/integrante/1', FAMILY, false)).toBe('/familia');
  });

  it('en el teléfono, dentro de una sección oculta de administración marca "Resumen"', () => {
    expect(activeHref('/admin/usuarios', ADMIN, false)).toBe('/admin');
    expect(activeHref('/admin/contenidos/nueva-actividad', ADMIN, false)).toBe('/admin');
  });

  it('en escritorio marca la sección oculta en el teléfono', () => {
    expect(activeHref('/admin/usuarios', ADMIN, true)).toBe('/admin/usuarios');
    expect(activeHref('/admin', ADMIN, true)).toBe('/admin');
  });

  it('sin una sección que la contenga, no marca nada', () => {
    expect(activeHref('/evaluaciones', FAMILY, false)).toBeNull();
    expect(activeHref('/privacidad', FAMILY, false)).toBeNull();
  });
});

describe('publicFallback', () => {
  it.each([
    ['/actividades/caminata', '/actividades'],
    ['/situaciones/enojo-al-apagar', '/situaciones'],
    ['/directorio/abc', '/directorio'],
    ['/etapas/0-2', '/'],
    ['/legal/terminos', '/'],
    ['/actividades', '/'],
    ['/cuando-consultar', '/'],
  ] as const)('%s vuelve a %s', (pathname, expected) => {
    expect(publicFallback(pathname)).toBe(expected);
  });
});
