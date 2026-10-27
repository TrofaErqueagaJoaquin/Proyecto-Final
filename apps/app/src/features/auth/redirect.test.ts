import { safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it.each(['/hoy', '/familia/integrante/1', '/nueva-clave'])(
    'acepta la ruta interna %s',
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    'https://sitio-malicioso.example',
    '//sitio-malicioso.example',
    'javascript:alert(1)',
    'hoy',
    undefined,
    ['/hoy'],
  ])('rechaza %p y vuelve a /hoy (evita redirecciones abiertas)', (value) => {
    expect(safeNextPath(value)).toBe('/hoy');
  });
});
