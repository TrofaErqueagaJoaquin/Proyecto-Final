// Tokens del sistema de diseño "cálido y luminoso" (docs/planning/UX_AND_NAVIGATION.md §2).
// Todo color de texto se valida contra su fondo en tokens.test.ts (contraste WCAG AA).

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  surfaceSunken: string;
  ink: string;
  inkMuted: string;
  /** Texto, enlaces e íconos de marca (coral profundo: legible sobre fondos claros). */
  primary: string;
  onPrimary: string;
  primarySoft: string;
  /** Coral vivo de la marca: botones principales, el personaje y celebraciones. */
  brand: string;
  onBrand: string;
  /** Menta y sol: rellenos de logros, rachas y tarjetas destacadas (texto encima: onBrand). */
  mint: string;
  mintSoft: string;
  sun: string;
  sunSoft: string;
  accent: string;
  info: string;
  infoSoft: string;
  caution: string;
  cautionSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  border: string;
  borderStrong: string;
  focus: string;
}

// Paleta "cálida y luminosa" (rediseño de noviembre de 2026): crema, coral, menta y sol.
export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#FFF8F0',
    surface: '#FFFFFF',
    surfaceSunken: '#FFF0E3',
    ink: '#2B2D42',
    inkMuted: '#5C5F73',
    primary: '#B8452A',
    onPrimary: '#FFFFFF',
    primarySoft: '#FFE9DF',
    brand: '#FF7A59',
    onBrand: '#2B2D42',
    mint: '#3CC9A0',
    mintSoft: '#DDF6EE',
    sun: '#FFC93C',
    sunSoft: '#FFF3D1',
    accent: '#E0603E',
    info: '#3D5A80',
    infoSoft: '#E6ECF6',
    caution: '#7A5000',
    cautionSoft: '#FFF3D1',
    danger: '#B42331',
    dangerSoft: '#FDE4E4',
    success: '#18785D',
    successSoft: '#DDF6EE',
    border: '#F0E2D2',
    borderStrong: '#8E8577',
    focus: '#B8452A',
  },
  dark: {
    bg: '#1D1A22',
    surface: '#2A2530',
    surfaceSunken: '#15121A',
    ink: '#F7F1EA',
    inkMuted: '#C2B9C6',
    primary: '#FF9C80',
    onPrimary: '#1D1A22',
    primarySoft: '#3D2A29',
    brand: '#FF7A59',
    onBrand: '#1D1A22',
    mint: '#3CC9A0',
    mintSoft: '#173A31',
    sun: '#FFC93C',
    sunSoft: '#3A311A',
    accent: '#FF8B6B',
    info: '#A9C2E6',
    infoSoft: '#232B3A',
    caution: '#FFD27A',
    cautionSoft: '#3A311A',
    danger: '#FF9EA3',
    dangerSoft: '#3D2124',
    success: '#7FE0BE',
    successSoft: '#173A31',
    border: '#3A3340',
    borderStrong: '#8A8090',
    focus: '#FF9C80',
  },
};

/** Escala de 4 pt. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// Bordes generosos: el rediseño busca una interfaz blanda y amigable.
export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

/** Familias cargadas en el layout raíz con expo-font. */
export const fonts = {
  // Nunito redondeada para títulos (cálida, sin perder legibilidad); Atkinson para leer.
  display: 'Nunito_800ExtraBold',
  round: 'Nunito_700Bold',
  body: 'AtkinsonHyperlegibleNext_400Regular',
  bodyBold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

/** Escala modular 1,25 (base 16). */
export const typeScale = {
  display: { fontSize: 40, lineHeight: 46 },
  title: { fontSize: 31, lineHeight: 37 },
  heading: { fontSize: 24, lineHeight: 30 },
  subheading: { fontSize: 20, lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export const breakpoints = { tablet: 600, desktop: 1024 } as const;

/** Área táctil mínima (WCAG 2.2 y pautas de plataforma). */
export const minTouchTarget = 44;
