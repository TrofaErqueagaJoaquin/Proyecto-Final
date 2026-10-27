// Tokens del sistema de diseño "cuaderno de crianza" (docs/planning/UX_AND_NAVIGATION.md §2).
// Todo color de texto se valida contra su fondo en tokens.test.ts (contraste WCAG AA).

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  surfaceSunken: string;
  ink: string;
  inkMuted: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
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

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#FBF7F1',
    surface: '#FFFFFF',
    surfaceSunken: '#F3EDE3',
    ink: '#1F2A2E',
    inkMuted: '#55656A',
    primary: '#2F6B5A',
    onPrimary: '#FFFFFF',
    primarySoft: '#E3EFEA',
    accent: '#B9582F',
    info: '#3D5A80',
    infoSoft: '#E6ECF4',
    caution: '#7A5000',
    cautionSoft: '#F8EED9',
    danger: '#A1262C',
    dangerSoft: '#F8E3E3',
    success: '#2F6B3A',
    successSoft: '#E4F0E3',
    border: '#E2D9CC',
    borderStrong: '#8C8377',
    focus: '#2F6B5A',
  },
  dark: {
    bg: '#121816',
    surface: '#1B2320',
    surfaceSunken: '#0E1311',
    ink: '#ECEFEA',
    inkMuted: '#A7B3AE',
    primary: '#7FC4AE',
    onPrimary: '#0E1311',
    primarySoft: '#1F3530',
    accent: '#E59A78',
    info: '#9DB7D9',
    infoSoft: '#1E2836',
    caution: '#E8C170',
    cautionSoft: '#2E2615',
    danger: '#F19A9E',
    dangerSoft: '#3A1D1F',
    success: '#9BD3A4',
    successSoft: '#1C2E20',
    border: '#2C3632',
    borderStrong: '#6F7C77',
    focus: '#7FC4AE',
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

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Familias cargadas en el layout raíz con expo-font. */
export const fonts = {
  display: 'Fraunces_600SemiBold',
  body: 'AtkinsonHyperlegibleNext_400Regular',
  bodyBold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

/** Escala modular 1,25 (base 16). */
export const typeScale = {
  display: { fontSize: 39, lineHeight: 46 },
  title: { fontSize: 31, lineHeight: 38 },
  heading: { fontSize: 25, lineHeight: 31 },
  subheading: { fontSize: 20, lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export const breakpoints = { tablet: 600, desktop: 1024 } as const;

/** Área táctil mínima (WCAG 2.2 y pautas de plataforma). */
export const minTouchTarget = 44;
