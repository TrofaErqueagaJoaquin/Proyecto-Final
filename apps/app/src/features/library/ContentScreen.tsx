import { AGE_STAGES } from '@crecer/shared';
import { Link, type Href } from 'expo-router';
import { Puzzle, Stethoscope, UserPlus } from 'lucide-react-native';
import { useId, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { BroteEmptyState, BroteSays } from '@/features/brote/Brote';
import {
  Banner,
  Button,
  Card,
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
          Todavía no lo revisó un profesional. No reemplaza una consulta.
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
  if (item.isError) return <ErrorState error={item.error} onRetry={() => void item.refetch()} />;
  if (!item.data) return <BroteEmptyState title="No encontramos este contenido" />;
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
  // Un turno por ventana: si hay dos montadas (pantalla y asistente), una no libera a la otra.
  const id = useId();
  const visible = useOverlayTurn(`ficha-${id}`, item !== null);
  return (
    <Sheet visible={visible} title={shown?.title} onClose={onClose}>
      {shown ? <ContentDetail slug={shown.slug} /> : null}
    </Sheet>
  );
}

/**
 * El paso siguiente después de leer: actividades para esa edad (si es una etapa) y, sin sesión,
 * crear la cuenta. Con sesión, el catálogo se abre dentro del espacio de la familia.
 */
function NextStep({ slug }: { slug: string }) {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';
  if (slug === 'cuando-consultar') {
    // Después de "Cuándo consultar", el paso es buscar a quién consultar.
    return (
      <Link href="/directorio" asChild>
        <Button label="Buscar un profesional" icon={Stethoscope} fullWidth />
      </Link>
    );
  }
  const stage = AGE_STAGES.some((s) => s.slug === slug) ? slug : null;
  const base = signedIn ? '/catalogo' : '/actividades';
  const href = (stage ? `${base}?etapa=${stage}` : base) as Href;
  return (
    <Card>
      <BroteSays mood="feliz" size={88}>
        {stage ? '¿Probamos algo pensado para esta edad?' : '¿Probamos una actividad juntos?'}
      </BroteSays>
      <Link href={href} asChild>
        <Button
          label={stage ? 'Ver actividades para esta edad' : 'Ver actividades'}
          icon={Puzzle}
          fullWidth
        />
      </Link>
      {auth.status === 'signedOut' ? (
        <Link href="/registrarse" asChild>
          <Button label="Crear cuenta gratis" icon={UserPlus} variant="secondary" fullWidth />
        </Link>
      ) : null}
    </Card>
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
  if (item.isError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState error={item.error} onRetry={() => void item.refetch()} />
      </Screen>
    );
  }
  if (!item.data) {
    return (
      <Screen edges={['bottom']}>
        <BroteEmptyState
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
      <NextStep slug={content.slug} />
    </Screen>
  );
}
