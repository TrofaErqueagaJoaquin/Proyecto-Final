import { BookX } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Banner,
  Card,
  EmptyState,
  ErrorState,
  Disclosure,
  EvidenceChip,
  GrowthLine,
  makeStyles,
  Screen,
  Sheet,
  Skeleton,
  Text,
  useOverlayTurn,
} from '@/ui';

import { IconBadge } from './IconTile';
import type { Visual } from './libraryVisuals';
import { Markdown } from './Markdown';
import { splitSections } from './parse-markdown';
import { useContentItem } from './queries';
import { SourceList } from './SourceList';

type ContentItem = NonNullable<ReturnType<typeof useContentItem>['data']>;

const useStyles = makeStyles((t) => ({
  section: { gap: t.space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
}));

/**
 * El texto en secciones: queda abierta la primera (lo esencial) y las demás se pliegan con su
 * título a la vista ("Pantallas", "Cuándo consultar").
 */
function SectionedBody({ source }: { source: string }) {
  const styles = useStyles();
  const sections = splitSections(source);
  const firstTitled = sections.findIndex((s) => s.title !== null);
  const openCount = firstTitled === -1 ? sections.length : firstTitled + 1;
  return (
    <>
      <Card>
        {sections.slice(0, openCount).map((section, i) => (
          <View key={i} style={styles.section}>
            {section.title !== null ? <Text variant="heading">{section.title}</Text> : null}
            <Markdown source={section.body} />
          </View>
        ))}
      </Card>
      {sections.slice(openCount).map((section, i) => (
        // "Cuándo consultar" es información de seguridad: queda abierta.
        <Disclosure
          key={i}
          title={section.title ?? ''}
          initiallyOpen={/consultar/i.test(section.title ?? '')}
        >
          <Markdown source={section.body} />
        </Disclosure>
      ))}
    </>
  );
}

/**
 * Todo lo de un contenido menos el título: se usa en su pantalla y en la ventana de detalle.
 * Con `collapseSections`, el texto largo se pliega por secciones.
 */
export function ContentBody({
  content,
  collapseSections = false,
}: {
  content: ContentItem;
  collapseSections?: boolean;
}) {
  return (
    <>
      <Text variant="subheading" tone="muted">
        {content.summary}
      </Text>
      <EvidenceChip label={content.evidence_label} showHelp={!collapseSections} />
      {content.reviewed_at === null ? (
        <Banner tone="caution" title="En revisión profesional">
          Este contenido se basa en las fuentes citadas y todavía no fue revisado por un profesional
          de la salud. No reemplaza una consulta.
        </Banner>
      ) : null}
      <GrowthLine />
      {collapseSections ? (
        <SectionedBody source={content.body_md} />
      ) : (
        <Card>
          <Markdown source={content.body_md} />
        </Card>
      )}
      <Disclosure title={`Fuentes (${String(content.content_sources.length)})`}>
        <SourceList refs={content.content_sources} heading={false} />
      </Disclosure>
      <Text variant="caption" tone="muted">
        Última actualización: {new Date(content.updated_at).toLocaleDateString('es-AR')}
      </Text>
    </>
  );
}

function ContentDetail({ slug }: { slug: string }) {
  const item = useContentItem(slug);
  if (item.isPending) return <Skeleton height={240} />;
  if (item.isError) return <ErrorState onRetry={() => void item.refetch()} />;
  if (!item.data) return <EmptyState icon={BookX} title="No encontramos este contenido" />;
  return <ContentBody content={item.data} />;
}

/** Ventana con un contenido completo (por ejemplo, una ficha tocada en la grilla). */
export function ContentSheet({
  item,
  onClose,
}: {
  item: { slug: string; title: string } | null;
  onClose: () => void;
}) {
  // Se guarda la última ficha para que no se vacíe mientras la ventana se desliza al cerrarse.
  const [shown, setShown] = useState(item);
  if (item !== null && item !== shown) setShown(item);
  const visible = useOverlayTurn('ficha', item !== null);
  return (
    <Sheet visible={visible} title={shown?.title} onClose={onClose}>
      {shown ? <ContentDetail slug={shown.slug} /> : null}
    </Sheet>
  );
}

/** Pantalla de un contenido de la biblioteca: etapa, ficha o "cuándo consultar". */
export function ContentScreen({
  slug,
  collapseSections = false,
  visual,
}: {
  slug: string | undefined;
  collapseSections?: boolean;
  /** Ícono grande al lado del título (las etapas). */
  visual?: Visual;
}) {
  const styles = useStyles();
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
      {visual ? (
        <View style={styles.titleRow}>
          <IconBadge visual={visual} size={72} />
          <Text variant="title" style={{ flex: 1 }}>
            {content.title}
          </Text>
        </View>
      ) : (
        <Text variant="title">{content.title}</Text>
      )}
      <ContentBody content={content} collapseSections={collapseSections} />
    </Screen>
  );
}
