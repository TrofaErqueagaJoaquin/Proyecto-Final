import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { feedback } from '@/features/feedback/feedback';
import { makeStyles, Text, useTheme } from '@/ui';

import { toneColors } from './activityVisuals';
import type { Visual } from './libraryVisuals';

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  tile: {
    minHeight: 48,
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.lg,
    paddingHorizontal: t.space.sm,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  badge: { alignItems: 'center', justifyContent: 'center' },
}));

/** Columnas de la grilla según el ancho de la pantalla. */
export interface Columns {
  phone: number;
  tablet: number;
  desktop: number;
}

/** Ancho de cada tarjeta (misma cuenta que `useTileWidth` de las actividades, con columnas a elección). */
export function useColumnWidth(maxContent: number, columns: Columns) {
  const { width } = useWindowDimensions();
  const content = Math.min(width, maxContent) - 32;
  const count = width < 600 ? columns.phone : width < 1024 ? columns.tablet : columns.desktop;
  return Math.floor((content - 12 * (count - 1)) / count);
}

/** Ícono redondo con el color de su tono (decorativo: el nombre lo dice el texto de al lado). */
export function IconBadge({ visual, size = 64 }: { visual: Visual; size?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, visual.tone);
  const Icon = visual.icon;
  return (
    <View
      aria-hidden
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Icon color={fg} size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </View>
  );
}

/**
 * Tarjeta de la biblioteca: un ícono grande y el título, sin párrafos. Con `href` lleva a otra
 * pantalla; con `onPress` abre el detalle (por ejemplo, en una ventana).
 */
export function IconTile({
  visual,
  title,
  width,
  href,
  onPress,
  grow = false,
  iconSize = 64,
}: {
  visual: Visual;
  title: string;
  width: number;
  href?: Href;
  onPress?: () => void;
  /** Que la tarjeta se estire para completar la fila (útil cuando la última queda sola). */
  grow?: boolean;
  iconSize?: number;
}) {
  const styles = useStyles();
  // El Slot de expo-router no acepta estilos en arreglo ni como función: va un objeto plano.
  const style = StyleSheet.flatten([styles.tile, { width, flexGrow: grow ? 1 : 0 }]);
  const content: ReactNode = (
    <>
      <IconBadge visual={visual} size={iconSize} />
      <Text variant="bodyStrong" center>
        {title}
      </Text>
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={title} style={style}>
          {content}
        </Pressable>
      </Link>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [style, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      onPress={() => {
        feedback('tap');
        onPress?.();
      }}
    >
      {content}
    </Pressable>
  );
}

/** Contenedor de tarjetas: filas que se acomodan solas. */
export function IconGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.grid}>{children}</View>;
}
