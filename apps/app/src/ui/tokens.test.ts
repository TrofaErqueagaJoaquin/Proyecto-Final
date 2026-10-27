import { contrastRatio } from './contrast';
import { palettes, type ColorScheme, type Palette } from './tokens';

// Pares texto/fondo que la interfaz usa de verdad. WCAG 2.2 AA: 4,5:1 para texto normal.
const TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'surfaceSunken'],
  ['inkMuted', 'bg'],
  ['inkMuted', 'surface'],
  ['primary', 'bg'],
  ['primary', 'surface'],
  ['primary', 'primarySoft'],
  ['onPrimary', 'primary'],
  ['danger', 'surface'],
  ['danger', 'bg'],
  ['ink', 'infoSoft'],
  ['ink', 'cautionSoft'],
  ['ink', 'dangerSoft'],
  ['ink', 'successSoft'],
  ['ink', 'primarySoft'],
  ['caution', 'surface'],
  ['success', 'surface'],
  ['info', 'surface'],
];

// Bordes de controles e íconos: 3:1 contra el fondo (WCAG 1.4.11).
const NON_TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['borderStrong', 'surface'],
  ['borderStrong', 'bg'],
  ['focus', 'bg'],
  ['accent', 'bg'],
  ['accent', 'surface'],
];

describe.each(['light', 'dark'] satisfies ColorScheme[])('paleta %s', (scheme) => {
  const palette = palettes[scheme];

  it.each(TEXT_PAIRS)('texto %s sobre %s cumple AA (≥ 4,5:1)', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)('%s sobre %s es perceptible (≥ 3:1)', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(3);
  });

  it('el botón de peligro (texto surface sobre danger) cumple AA', () => {
    expect(contrastRatio(palette.surface, palette.danger)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrastRatio', () => {
  it('blanco sobre negro es 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });
});
