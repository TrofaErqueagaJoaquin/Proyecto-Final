import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { storage } from '@/lib/storage';

import {
  breakpoints,
  fonts,
  palettes,
  radius,
  space,
  typeScale,
  type ColorScheme,
  type Palette,
} from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  space: typeof space;
  radius: typeof radius;
  fonts: typeof fonts;
  type: typeof typeScale;
  breakpoints: typeof breakpoints;
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const STORAGE_KEY = 'crecer.theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    storage
      .getItem(STORAGE_KEY)
      .then((stored) => {
        if (isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      theme: {
        scheme,
        colors: palettes[scheme],
        space,
        radius,
        fonts,
        type: typeScale,
        breakpoints,
      },
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        storage.setItem(STORAGE_KEY, next).catch(() => undefined);
      },
    };
  }, [preference, system]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useThemeContext(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return context;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

/**
 * Hojas de estilo que dependen del tema. Se calculan una vez por esquema (claro/oscuro).
 * Uso: `const useStyles = makeStyles((t) => ({ box: { backgroundColor: t.colors.surface } }));`
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T>>(
  // La intersección da tipado contextual a los literales ('row', 'center'…), como StyleSheet.create.
  factory: (theme: Theme) => T & NamedStyles<Record<string, unknown>>,
) {
  const cache = new Map<ColorScheme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    const cached = cache.get(theme.scheme);
    if (cached) return cached;
    const created = StyleSheet.create(factory(theme)) as T;
    cache.set(theme.scheme, created);
    return created;
  };
}
