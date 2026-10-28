import { Sprout } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { flexGrow: 1 },
  fill: { flex: 1, minHeight: 0 },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.xl,
    gap: t.space.lg,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.lg,
    padding: t.space.xl,
    gap: t.space.md,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
}));

/** Contenedor de pantalla: área segura, desplazamiento y ancho de lectura cómodo. */
export function Screen({
  children,
  maxWidth = 720,
  scroll = true,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  maxWidth?: number;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const styles = useStyles();
  // Sin desplazamiento propio (chat), el contenido ocupa el alto disponible y su ScrollView interno
  // es el que se desplaza; si no, crece con los mensajes y lo de abajo queda fuera de la pantalla.
  const content = (
    <View style={[styles.content, { maxWidth }, !scroll && styles.fill]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.logo}>
      <Sprout color={colors.primary} size={size === 'lg' ? 32 : 24} aria-hidden />
      <Text
        // Marca, no encabezado: usa la tipografía de títulos sin rol de heading.
        variant="bodyStrong"
        style={{
          fontFamily: 'Fraunces_600SemiBold',
          fontSize: size === 'lg' ? 31 : 20,
          lineHeight: size === 'lg' ? 38 : 26,
        }}
      >
        Crecer en Casa
      </Text>
    </View>
  );
}

/**
 * "Línea de crecimiento": trazo orgánico propio de la identidad visual. Decorativa como
 * divisor; con `progress` (0–1) se usa como barra de avance accesible.
 */
export function GrowthLine({ progress, label }: { progress?: number; label?: string }) {
  const { colors } = useTheme();
  const path = 'M2 12 C 40 2, 80 22, 120 12 S 200 2, 240 12 S 320 22, 358 12';
  const value = progress === undefined ? undefined : Math.min(1, Math.max(0, progress));
  return (
    <View
      aria-hidden={value === undefined}
      accessibilityRole={value === undefined ? undefined : 'progressbar'}
      accessibilityLabel={label}
      accessibilityValue={
        value === undefined ? undefined : { min: 0, max: 100, now: Math.round(value * 100) }
      }
    >
      <Svg width="100%" height={24} viewBox="0 0 360 24" preserveAspectRatio="none">
        <Path d={path} stroke={colors.border} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path
          d={path}
          stroke={colors.accent}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={value === undefined ? undefined : [value * 380, 400]}
        />
      </Svg>
    </View>
  );
}
