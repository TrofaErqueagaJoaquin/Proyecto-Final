import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { minTouchTarget } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: minTouchTarget + 4,
    // Nunca más ancho que su contenedor: un texto largo pasa a dos líneas en vez de salirse.
    maxWidth: '100%',
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.xs,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: t.space.sm,
    borderWidth: 1.5,
  },
  primary: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  secondary: { backgroundColor: t.colors.surface, borderColor: t.colors.borderStrong },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: t.colors.danger, borderColor: t.colors.danger },
  pressed: { opacity: 0.85 },
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
  label: { flexShrink: 1, textAlign: 'center' },
}));

export function Button({
  label,
  variant = 'primary',
  icon: Icon,
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isDisabled = disabled === true || loading;
  const foreground =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'danger'
        ? colors.surface
        : variant === 'ghost'
          ? colors.primary
          : colors.ink;

  return (
    <Pressable
      // Primero las props externas: `Link asChild` inyecta las suyas (incluido `style`) y las
      // propias del botón tienen que ganar.
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
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
          fullWidth && styles.fullWidth,
          hovered === true && styles.hovered,
          state.pressed && styles.pressed,
          focused === true && styles.focused,
          isDisabled && styles.disabled,
        ];
      }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : Icon ? (
          <Icon color={foreground} size={20} aria-hidden />
        ) : null}
        <Text variant="bodyStrong" style={[styles.label, { color: foreground }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
