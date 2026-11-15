import { nextTheme, THEME_CHECKS } from './queries';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('nextTheme', () => {
  it('recomienda primero el tema que salió "por dónde empezar"', () => {
    const bands = new Map([
      ['sueno', 'strength'],
      ['calma', 'watch'],
      ['movimiento', 'priority'],
    ]);
    expect(nextTheme(bands, new Set())?.slug).toBe('tema-movimiento');
  });

  it('después, los que están "para mirar"', () => {
    const bands = new Map([
      ['movimiento', 'priority'],
      ['calma', 'watch'],
    ]);
    expect(nextTheme(bands, new Set(['tema-movimiento']))?.slug).toBe('tema-calma');
  });

  it('sin resultados, sigue el orden de la lista', () => {
    expect(nextTheme(undefined, undefined)?.slug).toBe(THEME_CHECKS[0]?.slug);
  });

  it('con todos los temas hechos, no recomienda nada', () => {
    const done = new Set(THEME_CHECKS.map((t) => t.slug));
    expect(nextTheme(new Map(), done)).toBeNull();
  });
});
