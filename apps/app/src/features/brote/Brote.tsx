import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { makeStyles, Text, useTheme } from '@/ui';

export type BroteMood = 'hola' | 'feliz' | 'pensando' | 'calma';

/**
 * Brote, el personaje de Crecer en Casa: acompaña los momentos clave (bienvenida, preguntas,
 * logros, pausa). Se mueve poco y suave; con "reducir movimiento" del sistema se queda quieto.
 */
export function Brote({
  mood = 'hola',
  size = 120,
  celebrate = 0,
}: {
  mood?: BroteMood;
  size?: number;
  /** Cambiar este número hace que Brote dé un saltito (por ejemplo, al marcar "Hecho"). */
  celebrate?: number;
}) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  const jump = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    // Respiración lenta: sube y baja 4 px cada 2,4 s (en calma, más lento todavía).
    const half = mood === 'calma' ? 2200 : 1200;
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: half, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: half, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [bob, mood, reduced]);

  useEffect(() => {
    if (reduced || celebrate === 0) return;
    jump.value = withSequence(
      withTiming(-18, { duration: 160, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 6, stiffness: 180 }),
    );
  }, [celebrate, jump, reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + jump.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size * 1.1 }, style]} aria-hidden>
      <BroteDrawing mood={mood} size={size} />
    </Animated.View>
  );
}

function BroteDrawing({ mood, size }: { mood: BroteMood; size: number }) {
  const { colors } = useTheme();
  const ink = '#2B2D42';
  const eyesClosed = mood === 'feliz' || mood === 'calma';

  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 120 132">
      {/* Sombra */}
      <Ellipse cx={60} cy={126} rx={30} ry={4} fill={ink} opacity={0.08} />
      {/* Tallo y hojas */}
      <Path d="M60 50 C60 40 60 34 60 28" stroke="#1F8A6B" strokeWidth={4} strokeLinecap="round" />
      <Path d="M60 32 C48 14 30 16 26 24 C34 34 50 36 60 32 Z" fill={colors.mint} />
      <Path d="M60 30 C70 10 90 10 96 18 C88 30 72 34 60 30 Z" fill={colors.brand} />
      {/* Cuerpo */}
      <Ellipse cx={60} cy={86} rx={40} ry={38} fill={colors.sun} />
      <Ellipse cx={60} cy={96} rx={26} ry={22} fill="#FFFFFF" opacity={0.45} />
      {/* Brazos-hoja */}
      {mood === 'hola' ? (
        <Path d="M98 78 C110 66 116 56 112 50 C104 52 98 62 96 74 Z" fill={colors.mint} />
      ) : (
        <Path d="M99 88 C110 92 114 100 110 104 C102 102 98 96 97 92 Z" fill={colors.mint} />
      )}
      {mood === 'feliz' ? (
        <Path d="M22 78 C10 66 4 56 8 50 C16 52 22 62 24 74 Z" fill={colors.mint} />
      ) : (
        <Path d="M21 88 C10 92 6 100 10 104 C18 102 22 96 23 92 Z" fill={colors.mint} />
      )}
      {/* Cachetes */}
      <Circle cx={36} cy={92} r={6} fill={colors.brand} opacity={0.45} />
      <Circle cx={84} cy={92} r={6} fill={colors.brand} opacity={0.45} />
      {/* Ojos */}
      <G>
        {eyesClosed ? (
          <>
            <Path
              d={mood === 'feliz' ? 'M40 80 Q46 72 52 80' : 'M40 80 Q46 84 52 80'}
              stroke={ink}
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={mood === 'feliz' ? 'M68 80 Q74 72 80 80' : 'M68 80 Q74 84 80 80'}
              stroke={ink}
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <Ellipse cx={46} cy={mood === 'pensando' ? 76 : 79} rx={5} ry={6} fill={ink} />
            <Ellipse cx={74} cy={mood === 'pensando' ? 76 : 79} rx={5} ry={6} fill={ink} />
            <Circle cx={48} cy={mood === 'pensando' ? 74 : 77} r={1.8} fill="#FFFFFF" />
            <Circle cx={76} cy={mood === 'pensando' ? 74 : 77} r={1.8} fill="#FFFFFF" />
          </>
        )}
      </G>
      {/* Boca */}
      {mood === 'pensando' ? (
        <Circle cx={62} cy={98} r={4} fill={ink} />
      ) : mood === 'calma' ? (
        <Path
          d="M52 96 Q60 101 68 96"
          stroke={ink}
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <Path d="M48 94 Q60 108 72 94 Z" fill={ink} />
      )}
    </Svg>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: t.space.md },
  bubble: {
    flexShrink: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderBottomLeftRadius: 6,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    marginBottom: t.space.xl,
  },
}));

/** Brote con un globo de diálogo: la forma de "hablarle" a la familia en los momentos clave. */
export function BroteSays({
  children,
  mood = 'hola',
  size = 96,
  celebrate,
}: {
  children: string;
  mood?: BroteMood;
  size?: number;
  celebrate?: number;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Brote mood={mood} size={size} celebrate={celebrate} />
      <View style={styles.bubble} accessibilityLiveRegion="polite">
        <Text variant="bodyStrong">{children}</Text>
      </View>
    </View>
  );
}
