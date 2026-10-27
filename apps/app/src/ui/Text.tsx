import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { makeStyles, useTheme } from './theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'caption'
  | 'label';

export type TextTone =
  'default' | 'muted' | 'primary' | 'onPrimary' | 'danger' | 'caution' | 'success' | 'info';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  center?: boolean;
}

// Nivel de encabezado por variante: en web se traduce a h1–h3 (un solo h1 por pantalla).
const HEADING_LEVEL: Partial<Record<TextVariant, 1 | 2 | 3>> = {
  display: 1,
  title: 1,
  heading: 2,
  subheading: 3,
};

const useStyles = makeStyles((t) => ({
  display: { ...t.type.display, fontFamily: t.fonts.display },
  title: { ...t.type.title, fontFamily: t.fonts.display },
  heading: { ...t.type.heading, fontFamily: t.fonts.display },
  subheading: { ...t.type.subheading, fontFamily: t.fonts.bodyBold },
  body: { ...t.type.body, fontFamily: t.fonts.body },
  bodyStrong: { ...t.type.body, fontFamily: t.fonts.bodyBold },
  small: { ...t.type.small, fontFamily: t.fonts.body },
  caption: { ...t.type.caption, fontFamily: t.fonts.body },
  label: { ...t.type.small, fontFamily: t.fonts.bodyBold },
  center: { textAlign: 'center' },
}));

/** Texto con la escala tipográfica del proyecto. Los títulos se anuncian como encabezados. */
export function Text({ variant = 'body', tone = 'default', center, style, ...rest }: TextProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = {
    default: colors.ink,
    muted: colors.inkMuted,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    danger: colors.danger,
    caution: colors.caution,
    success: colors.success,
    info: colors.info,
  }[tone];

  return (
    <RNText
      role={HEADING_LEVEL[variant] ? 'heading' : undefined}
      aria-level={HEADING_LEVEL[variant]}
      maxFontSizeMultiplier={2}
      style={[styles[variant], { color }, center && styles.center, style]}
      {...rest}
    />
  );
}
