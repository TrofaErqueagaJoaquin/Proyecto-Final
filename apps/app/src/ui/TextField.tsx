import { Eye, EyeOff } from 'lucide-react-native';
import { useId, useState, type Ref } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';

import type { Mask } from './masks';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { minTouchTarget } from './tokens';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string | undefined;
  /** Da formato mientras se escribe (por ejemplo, la barra de MM/AAAA). */
  mask?: Mask;
  /** Para mover el foco a este campo (Enter en el anterior, o el primer error al guardar). */
  ref?: Ref<TextInputInstance> | undefined;
}

const useStyles = makeStyles((t) => ({
  field: { gap: t.space.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget + 4,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surface,
  },
  focused: { borderColor: t.colors.focus, borderWidth: 2 },
  invalid: { borderColor: t.colors.danger },
  input: {
    flex: 1,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    ...t.type.body,
    fontFamily: t.fonts.body,
    color: t.colors.ink,
    // El foco se indica con el borde del contenedor (estilo `focused`).
    outlineWidth: 0,
  },
  toggle: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

/**
 * Campo con etiqueta visible (nunca solo placeholder), ayuda y error asociados.
 * Con `secureTextEntry`, ofrece mostrar/ocultar la contraseña. Con `returnKeyType="next"`, Enter
 * pasa al campo siguiente sin cerrar el teclado (ver `useFieldErrors().field`).
 */
export function TextField({
  label,
  hint,
  error,
  secureTextEntry,
  mask,
  ref,
  ...rest
}: TextFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const description = [error, hint].filter(Boolean).join('. ');

  return (
    <View style={styles.field}>
      <Text variant="label" nativeID={`${id}-label`}>
        {label}
      </Text>
      <View style={[styles.inputRow, focused && styles.focused, error ? styles.invalid : null]}>
        <TextInput
          // Pasar al siguiente sin que el teclado se cierre y se vuelva a abrir.
          submitBehavior={
            rest.returnKeyType === 'next' && rest.multiline !== true ? 'submit' : undefined
          }
          {...rest}
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${id}-label`}
          accessibilityHint={description || undefined}
          aria-invalid={error ? true : undefined}
          placeholderTextColor={colors.inkMuted}
          secureTextEntry={secureTextEntry === true && !revealed}
          style={styles.input}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          onChangeText={
            mask && rest.onChangeText
              ? (text) => rest.onChangeText?.(mask(text, rest.value ?? ''))
              : rest.onChangeText
          }
        />
        {secureTextEntry === true && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => {
              setRevealed((value) => !value);
            }}
            style={styles.toggle}
          >
            {revealed ? (
              <EyeOff color={colors.inkMuted} size={20} />
            ) : (
              <Eye color={colors.inkMuted} size={20} />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text variant="small" tone="danger" accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
