import { familyFallback, publicFallback } from './backTargets';

const SECTIONS = ['/hoy', '/familia', '/mis-actividades', '/evaluaciones', '/perfil'];

describe('familyFallback', () => {
  it('las secciones de la navegación no tienen "Volver"', () => {
    for (const href of SECTIONS) expect(familyFallback(href, SECTIONS)).toBeNull();
  });

  it.each([
    ['/evaluaciones/abc/resultado', '/evaluaciones'],
    ['/evaluaciones/historial/m1', '/evaluaciones'],
    ['/familia/integrante/123', '/familia'],
    ['/familia/invitar', '/familia'],
  ] as const)('%s vuelve a %s', (pathname, expected) => {
    expect(familyFallback(pathname, SECTIONS)).toBe(expected);
  });

  it('una pantalla suelta vuelve a Hoy', () => {
    expect(familyFallback('/privacidad', SECTIONS)).toBe('/hoy');
    // "/familiar" no es una pantalla de "/familia".
    expect(familyFallback('/familiar', SECTIONS)).toBe('/hoy');
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
