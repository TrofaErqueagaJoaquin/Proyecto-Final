import type { ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { ActivityScene, sceneFor } from '@/features/animations';
import { feedback } from '@/features/feedback/feedback';
import { makeStyles, Text } from '@/ui';

import { useActivityFlow } from './ActivityFlow';

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  tile: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    padding: t.space.sm,
    gap: t.space.sm,
  },
}));

/** Ancho de cada tarjeta para que entren 2 por fila en el celular, 3 en tablet y 4 en compu. */
export function useTileWidth(maxContent = 1100) {
  const { width } = useWindowDimensions();
  const content = Math.min(width, maxContent) - 32;
  const columns = width < 600 ? 2 : width < 1024 ? 3 : 4;
  return Math.floor((content - 12 * (columns - 1)) / columns);
}

export interface TileActivity {
  slug: string;
  title: string;
  categories: readonly string[];
}

/** Tarjeta simple: el dibujo de la actividad y su nombre. Al tocarla se abre el detalle. */
export function ActivityTile({
  activity,
  width,
  badge,
}: {
  activity: TileActivity;
  width: number;
  badge?: ReactNode;
}) {
  const styles = useStyles();
  const flow = useActivityFlow();
  const inner = width - 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={activity.title}
      style={({ pressed }) => [styles.tile, { width, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      onPress={() => {
        feedback('tap');
        flow.open(activity.slug, activity.title);
      }}
    >
      <ActivityScene scene={sceneFor(activity.slug, activity.categories)} width={inner} label="" />
      <Text variant="bodyStrong" numberOfLines={2} style={{ minHeight: 54 }}>
        {activity.title}
      </Text>
      {badge}
    </Pressable>
  );
}

/** Grilla de tarjetas de actividades. */
export function ActivityGrid({
  activities,
  maxContent,
}: {
  activities: TileActivity[];
  maxContent?: number;
}) {
  const styles = useStyles();
  const width = useTileWidth(maxContent);
  return (
    <View style={styles.grid}>
      {activities.map((a) => (
        <ActivityTile key={a.slug} activity={a} width={width} />
      ))}
    </View>
  );
}
