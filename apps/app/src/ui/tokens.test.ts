import { contrastRatio } from './contrast';
import { minTouchTarget, palettes, typeScale, type ColorScheme, type Palette } from './tokens';

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
  ['onBrand', 'brand'],
  ['onBrand', 'mint'],
  ['onBrand', 'sun'],
  ['ink', 'mintSoft'],
  ['ink', 'sunSoft'],
  // Botón de acción que borra o quita (ConfirmAction): texto rojo sobre rojo suave.
  ['danger', 'dangerSoft'],
  // "✓ Guardado" en el botón (Button con savedKey).
  ['success', 'successSoft'],
];

// Bordes de controles e íconos: 3:1 contra el fondo (WCAG 1.4.11).
const NON_TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['borderStrong', 'surface'],
  ['borderStrong', 'bg'],
  ['focus', 'bg'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  // Contorno de los chips sin elegir (ChipGroup): tienen que verse como botones.
  ['borderStrong', 'surfaceSunken'],
  // Ícono y contorno del botón que borra (ConfirmAction).
  ['danger', 'dangerSoft'],
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

describe('tamaños mínimos', () => {
  it('el área táctil mínima es de 48 px', () => {
    expect(minTouchTarget).toBeGreaterThanOrEqual(48);
  });

  it('ninguna letra baja de 15 px (rótulos y pestañas incluidos)', () => {
    for (const style of Object.values(typeScale)) {
      expect(style.fontSize).toBeGreaterThanOrEqual(15);
    }
  });
});

describe('contrastRatio', () => {
  it('blanco sobre negro es 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });
});
