import { useState } from 'react';

import { useTileWidth } from '@/features/library/ActivityTile';
import { ContentSheet } from '@/features/library/ContentScreen';
import { IconGrid, IconTile } from '@/features/library/IconTile';
import { shortTitle, situationVisual } from '@/features/library/libraryVisuals';
import { useContentList } from '@/features/library/queries';
import { ErrorState, Screen, Skeleton, Text } from '@/ui';

/** Fichas de situaciones: un ícono y el título; al tocar, la ficha completa en una ventana. */
export default function SituationsScreen() {
  const situations = useContentList('situation_card');
  const width = useTileWidth(960);
  const [opened, setOpened] = useState<{ slug: string; title: string } | null>(null);
  return (
    <>
      <Screen edges={['bottom']} maxWidth={960}>
        <Text variant="title">Situaciones difíciles</Text>
        <Text tone="muted">Tocá una para ver qué hacer. Ante la duda, consultá.</Text>
        {situations.isPending ? (
          <Skeleton height={300} />
        ) : situations.isError ? (
          <ErrorState onRetry={() => void situations.refetch()} />
        ) : (
          <IconGrid>
            {situations.data.map((s) => {
              const title = shortTitle(s.title);
              return (
                <IconTile
                  key={s.slug}
                  visual={situationVisual(s.slug, s.title)}
                  title={title}
                  width={width}
                  onPress={() => {
                    setOpened({ slug: s.slug, title });
                  }}
                />
              );
            })}
          </IconGrid>
        )}
      </Screen>
      {/* Fuera del desplazamiento de la pantalla, como la ventana de actividades: los gestos
          dentro de la ventana no llegan al ScrollView de atrás. */}
      <ContentSheet
        item={opened}
        onClose={() => {
          setOpened(null);
        }}
      />
    </>
  );
}
