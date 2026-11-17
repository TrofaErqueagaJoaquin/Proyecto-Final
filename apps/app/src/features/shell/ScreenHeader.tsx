import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { makeStyles, Text } from '@/ui';

import { BACK_SIZE, BackButton } from './BackButton';

const useStyles = makeStyles((t) => ({
  safe: { backgroundColor: t.colors.bg },
  // Barra con fondo y borde (pública y de acceso).
  barSafe: {
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    minHeight: BACK_SIZE,
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
  },
  barRow: { paddingVertical: t.space.sm },
  start: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, flexShrink: 1 },
  // Sin flecha, lo primero no queda pegado al borde.
  startAlone: { paddingLeft: t.space.sm },
  title: { flexShrink: 1 },
  end: { marginLeft: 'auto', flexShrink: 0, paddingRight: t.space.xs },
}));

/**
 * Encabezado común: flecha de "Volver" (48 px), título y lo que acompañe (logo, botón) en un
 * solo renglón. Envuelve el área segura de arriba, así nada queda bajo la muesca.
 */
export function ScreenHeader({
  back,
  title,
  start,
  end,
  bar = false,
}: {
  /** A dónde vuelve si no hay historial. Sin valor, no hay flecha. */
  back?: Href | null;
  /** Título corto, en el mismo renglón que la flecha. */
  title?: string;
  /** Después de la flecha (por ejemplo, el logo). */
  start?: ReactNode;
  /** Al final del renglón (por ejemplo, "Ingresar"). */
  end?: ReactNode;
  /** Con fondo y borde de barra. */
  bar?: boolean;
}) {
  const styles = useStyles();
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, bar && styles.barSafe]}>
      <View style={[styles.row, bar && styles.barRow]}>
        <View style={[styles.start, back == null && styles.startAlone]}>
          {back == null ? null : <BackButton fallback={back} />}
          {title ? (
            <Text variant="subheading" numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          ) : null}
          {start}
        </View>
        {end ? <View style={styles.end}>{end}</View> : null}
      </View>
    </SafeAreaView>
  );
}
