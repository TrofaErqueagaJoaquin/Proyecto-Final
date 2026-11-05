import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/ui';

const PIECES = 26;

function Piece({
  trigger,
  x,
  delay,
  color,
  size,
  spin,
}: {
  trigger: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  spin: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, progress, trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 1 - progress.value * progress.value,
    transform: [
      { translateX: x + Math.sin(progress.value * 6) * 12 },
      { translateY: -20 + progress.value * 420 },
      { rotate: `${String(progress.value * spin)}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: 0, width: size, height: size * 0.6 },
        { backgroundColor: color, borderRadius: 2 },
        style,
      ]}
    />
  );
}

/** Papelitos de colores para festejar. No ocupa lugar ni recibe toques. */
export function Confetti({ trigger }: { trigger: number }) {
  const reduced = useReducedMotion();
  const { colors } = useTheme();
  const pieces = useMemo(() => {
    const palette = [colors.brand, colors.mint, colors.sun, colors.primary];
    return Array.from({ length: PIECES }, (_, i) => ({
      key: i,
      // Distribución fija (sin Math.random en el render): se ve igual de pareja siempre.
      x: ((i * 37) % 100) * 3.4,
      delay: (i % 7) * 60,
      color: palette[i % palette.length] ?? colors.brand,
      size: 8 + (i % 4) * 2,
      spin: 180 + (i % 5) * 90,
    }));
  }, [colors]);

  if (reduced || trigger === 0) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'visible', zIndex: 10 }]}
    >
      {pieces.map(({ key, ...piece }) => (
        <Piece key={key} trigger={trigger} {...piece} />
      ))}
    </View>
  );
}
