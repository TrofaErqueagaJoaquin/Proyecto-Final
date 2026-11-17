import { Check, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { minTouchTarget } from './tokens';

/** `dangerSoft`: rojo suave para la acción que borra o quita, antes de confirmar. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft';

/** Cuánto dura "✓ Guardado" en el botón. */
export const SAVED_MS = 2000;

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Cambiar este número (por ejemplo, `setSaved((n) => n + 1)` al guardar) muestra
   * "✓ Guardado" en el botón durante 2 s, en lugar de un aviso fijo.
   */
  savedKey?: number;
  /** Texto de confirmación de `savedKey`. */
  savedLabel?: string;
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: minTouchTarget + 8,
    // Nunca más ancho que su contenedor: un texto largo pasa a dos líneas en vez de salirse.
    maxWidth: '100%',
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.sm,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: t.space.sm,
    borderWidth: 2,
  },
  // Coral vivo con texto oscuro: llamativo y con contraste AA (tokens.test.ts).
  primary: {
    backgroundColor: t.colors.brand,
    borderColor: t.colors.brand,
    shadowColor: t.colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  secondary: { backgroundColor: t.colors.surface, borderColor: t.colors.borderStrong },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: t.colors.danger, borderColor: t.colors.danger },
  dangerSoft: { backgroundColor: t.colors.dangerSoft, borderColor: t.colors.danger },
  saved: { backgroundColor: t.colors.successSoft, borderColor: t.colors.success },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  hovered: { opacity: 0.92 },
  focused: {
    outlineColor: t.colors.focus,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
  disabled: { opacity: 0.5 },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, flexShrink: 1 },
  label: { flexShrink: 1, textAlign: 'center', fontFamily: t.fonts.round, fontSize: 17 },
}));

export function Button({
  label,
  variant = 'primary',
  icon: Icon,
  loading = false,
  fullWidth = false,
  disabled,
  savedKey = 0,
  savedLabel = 'Guardado',
  ...rest
}: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const saved = useSaved(savedKey);
  const isDisabled = disabled === true || loading;
  const foreground = saved
    ? colors.success
    : variant === 'primary'
      ? colors.onBrand
      : variant === 'danger'
        ? colors.surface
        : variant === 'ghost'
          ? colors.primary
          : variant === 'dangerSoft'
            ? colors.danger
            : colors.ink;
  const shownLabel = saved ? savedLabel : label;
  const ShownIcon = saved ? Check : Icon;

  return (
    <Pressable
      // Primero las props externas: `Link asChild` inyecta las suyas (incluido `style`) y las
      // propias del botón tienen que ganar.
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={shownLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => {
        // `hovered` y `focused` solo existen en web (react-native-web).
        const { hovered, focused } = state as typeof state & {
          hovered?: boolean;
          focused?: boolean;
        };
        return [
          styles.base,
          styles[variant],
          saved && styles.saved,
          fullWidth && styles.fullWidth,
          hovered === true && styles.hovered,
          state.pressed && styles.pressed,
          focused === true && styles.focused,
          // Durante "✓ Guardado" el botón suele quedar deshabilitado (no hay cambios): no se
          // apaga, para que el aviso se lea.
          isDisabled && (!saved || loading) && styles.disabled,
        ];
      }}
    >
      <View style={styles.content} accessibilityLiveRegion={savedKey > 0 ? 'polite' : undefined}>
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : ShownIcon ? (
          <ShownIcon color={foreground} size={20} aria-hidden />
        ) : null}
        <Text variant="bodyStrong" style={[styles.label, { color: foreground }]}>
          {shownLabel}
        </Text>
      </View>
    </Pressable>
  );
}

/** `true` durante `SAVED_MS` cada vez que cambia `key` (salvo en 0). */
function useSaved(key: number) {
  // La última clave que ya cumplió sus 2 s: mientras `key` sea otra, se muestra "Guardado".
  const [expiredKey, setExpiredKey] = useState(0);
  useEffect(() => {
    if (key === 0) return;
    const timer = setTimeout(() => {
      setExpiredKey(key);
    }, SAVED_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [key]);
  return key !== 0 && expiredKey !== key;
}
