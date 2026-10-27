import { BookX } from 'lucide-react-native';

import {
  Banner,
  Card,
  EmptyState,
  ErrorState,
  EvidenceChip,
  GrowthLine,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

import { Markdown } from './Markdown';
import { useContentItem } from './queries';
import { SourceList } from './SourceList';

/** Pantalla de un contenido de la biblioteca: etapa, ficha o "cuándo consultar". */
export function ContentScreen({ slug }: { slug: string | undefined }) {
  const item = useContentItem(slug);

  if (item.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={40} width="70%" />
        <Skeleton height={20} width="40%" />
        <Skeleton height={240} />
      </Screen>
    );
  }
  if (item.isError) return <ErrorState onRetry={() => void item.refetch()} />;
  if (!item.data) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={BookX}
          title="No encontramos este contenido"
          description="Puede que se haya movido o que todavía no esté publicado."
        />
      </Screen>
    );
  }

  const content = item.data;
  return (
    <Screen edges={['bottom']}>
      <Text variant="title">{content.title}</Text>
      <Text variant="subheading" tone="muted">
        {content.summary}
      </Text>
      <EvidenceChip label={content.evidence_label} showHelp />
      {content.reviewed_at === null ? (
        <Banner tone="caution" title="En revisión profesional">
          Este contenido se basa en las fuentes citadas y todavía no fue revisado por un profesional
          de la salud. No reemplaza una consulta.
        </Banner>
      ) : null}
      <GrowthLine />
      <Card>
        <Markdown source={content.body_md} />
      </Card>
      <Card>
        <SourceList refs={content.content_sources} />
      </Card>
      <Text variant="caption" tone="muted">
        Última actualización: {new Date(content.updated_at).toLocaleDateString('es-AR')}
      </Text>
    </Screen>
  );
}
