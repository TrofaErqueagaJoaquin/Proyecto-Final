import { router, type Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { confirmLeave } from '@/features/forms/useUnsavedGuard';
import { makeStyles, useTheme } from '@/ui';

/** Lado de la flecha: más que el mínimo de 44 px, porque es la salida de cada pantalla. */
export const BACK_SIZE = 48;

const useStyles = makeStyles((t) => ({
  button: {
    width: BACK_SIZE,
    height: BACK_SIZE,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: t.colors.primarySoft },
  focused: {
    outlineColor: t.colors.focus,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
}));

/**
 * "Volver": una flecha sola. Vuelve a la pantalla anterior y, si no hay historial (se entró
 * por un enlace o se recargó la página), va a `fallback`. Nunca saca de la app. Si hay un
 * formulario a medio cargar, antes pregunta "¿Salir sin guardar?" (`useUnsavedGuard`).
 */
export function BackButton({ fallback }: { fallback: Href }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      hitSlop={4}
      onPress={() => {
        confirmLeave(() => {
          if (router.canGoBack()) router.back();
          else router.replace(fallback);
        });
      }}
      style={(state) => {
        // `hovered` y `focused` solo existen en web (react-native-web).
        const { hovered, focused } = state as typeof state & {
          hovered?: boolean;
          focused?: boolean;
        };
        return [
          styles.button,
          (state.pressed || hovered === true) && styles.pressed,
          focused === true && styles.focused,
        ];
      }}
    >
      <ArrowLeft color={colors.ink} size={28} strokeWidth={2.5} aria-hidden />
    </Pressable>
  );
}
