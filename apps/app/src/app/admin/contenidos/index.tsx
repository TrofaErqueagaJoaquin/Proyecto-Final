import { Link } from 'expo-router';
import {
  BookPlus,
  CircleCheck,
  Clock,
  Ellipsis,
  Eye,
  EyeOff,
  FilePlus,
  ListPlus,
  Pencil,
  Send,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  useAdminContent,
  useAdminSources,
  usePermissions,
  usePublishQuestionnaire,
  useSetContentStatus,
} from '@/features/admin/queries';
import { ActivityScene, sceneFor } from '@/features/animations';
import { useMfaStatus } from '@/features/auth/mfa';
import { IconBadge } from '@/features/library/IconTile';
import { situationVisual } from '@/features/library/libraryVisuals';
import {
  Badge,
  Banner,
  Button,
  Card,
  ChipGroup,
  ConfirmAction,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

const STATUS: Record<string, { label: string; icon: LucideIcon; published?: boolean }> = {
  draft: { label: 'Sin publicar', icon: Pencil },
  in_review: { label: 'Para revisar', icon: Clock },
  published: { label: 'Publicada', icon: CircleCheck, published: true },
  archived: { label: 'Oculta', icon: EyeOff },
  retired: { label: 'Oculta', icon: EyeOff },
};
const TABS = [
  { value: 'activity', label: 'Actividades' },
  { value: 'content', label: 'Fichas' },
  { value: 'source', label: 'Fuentes' },
  { value: 'questionnaire', label: 'Cuestionarios' },
] as const;

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Dónde la ven las familias (null si ese tipo no tiene pantalla propia). */
function contentHref(type: string, slug: string): string | null {
  if (type === 'situation_card') return `/situaciones/${slug}`;
  if (type === 'age_stage') return `/etapas/${slug}`;
  return null;
}

interface Row {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  href: string | null;
  visual: ReactNode;
  /** En la demo sin segundo factor solo se cambia lo cargado desde el panel. */
  canChange: boolean;
}

/** Una actividad o ficha: dibujo, nombre, estado y una sola acción a la vista. */
function ContentRow({
  row,
  canPublish,
  busy,
  onStatus,
}: {
  row: Row;
  canPublish: boolean;
  busy: boolean;
  onStatus: (status: 'published' | 'archived' | 'in_review') => void;
}) {
  const [more, setMore] = useState(false);
  const status = STATUS[row.status] ?? { label: row.status, icon: Pencil };
  const published = status.published === true;
  const viewHref = published ? row.href : null;

  const header = (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      {row.visual}
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="subheading">{row.title}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Badge tone={published ? 'primary' : 'neutral'} icon={status.icon}>
            {status.label}
          </Badge>
          <Text variant="small" tone="muted">
            {`Actualizada el ${DATE.format(new Date(row.updatedAt))}`}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Card>
      {viewHref ? (
        <Link href={viewHref as never} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${row.title}. ${status.label}. Ver en la app`}
            style={{ minHeight: 48 }}
          >
            {header}
          </Pressable>
        </Link>
      ) : (
        header
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {row.canChange && canPublish && !published ? (
          <Button
            label="Publicar"
            variant="secondary"
            icon={Send}
            loading={busy}
            onPress={() => {
              onStatus('published');
            }}
          />
        ) : null}
        {row.canChange && !canPublish && row.status === 'draft' ? (
          <Button
            label="Pedir que la publiquen"
            variant="secondary"
            icon={Send}
            loading={busy}
            onPress={() => {
              onStatus('in_review');
            }}
          />
        ) : null}
        {viewHref ? (
          <Link href={viewHref as never} asChild>
            <Button label="Ver en la app" variant="secondary" icon={Eye} />
          </Link>
        ) : null}
        {row.canChange && canPublish && published ? (
          <Button
            label="Más"
            variant="ghost"
            icon={Ellipsis}
            aria-expanded={more}
            onPress={() => {
              setMore((m) => !m);
            }}
          />
        ) : null}
      </View>
      {more && row.canChange && canPublish && published ? (
        <ConfirmAction
          label="Ocultar"
          confirmLabel="Sí, ocultar"
          description="Las familias dejan de verla. La podés volver a publicar."
          loading={busy}
          onConfirm={() => {
            onStatus('archived');
          }}
        />
      ) : null}
    </Card>
  );
}

/**
 * Contenidos: cargar actividades, fichas y fuentes nuevas (ADR-036) y publicarlas u ocultarlas.
 * Lo del repositorio lo carga `pnpm content:sync` y no toca lo cargado acá (origin = 'panel').
 */
export default function ContentAdminScreen() {
  const permissions = usePermissions();
  const content = useAdminContent();
  const sources = useAdminSources();
  const mfa = useMfaStatus();
  const setStatus = useSetContentStatus();
  const publishVersion = usePublishQuestionnaire();
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('activity');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const canPublish = permissions.has('content.publish');
  // Sin segundo factor (solo pasa en la demo) se toca únicamente lo cargado en el panel.
  const withoutMfa = mfa.data !== undefined && mfa.data.level !== 'aal2';
  const otherAdmin = [...permissions].some((p) => !p.startsWith('content.'));

  if (content.isPending) return <Skeleton height={300} />;
  if (content.isError) return <ErrorState onRetry={() => void content.refetch()} />;

  const q = normalize(query.trim());
  const matches = (text: string) => q === '' || normalize(text).includes(q);
  const newestFirst = (a: Row, b: Row) => b.updatedAt.localeCompare(a.updatedAt);

  const rows: Row[] =
    tab === 'content'
      ? content.data.content.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          updatedAt: c.updated_at,
          href: contentHref(c.type, c.slug),
          visual: <IconBadge visual={situationVisual(c.slug, c.title)} size={56} />,
          canChange: !withoutMfa || c.origin === 'panel',
        }))
      : tab === 'activity'
        ? content.data.activities.map((a) => ({
            id: a.id,
            title: a.title,
            status: a.status,
            updatedAt: a.updated_at,
            href: `/actividades/${a.slug}`,
            visual: (
              <View importantForAccessibility="no-hide-descendants" aria-hidden>
                <ActivityScene scene={sceneFor(a.slug)} width={72} label="" />
              </View>
            ),
            canChange: !withoutMfa || a.origin === 'panel',
          }))
        : [];
  const shownRows = rows.filter((r) => matches(r.title)).sort(newestFirst);
  const shownSources = (sources.data ?? []).filter((s) => matches(s.citation));
  const shownVersions = content.data.versions.filter((v) => matches(v.questionnaires.title));
  const shownCount =
    tab === 'source'
      ? shownSources.length
      : tab === 'questionnaire'
        ? shownVersions.length
        : shownRows.length;

  const changeStatus = (row: Row, status: 'published' | 'archived' | 'in_review') => {
    setNotice(null);
    setStatus.mutate(
      { kind: tab === 'activity' ? 'activity' : 'content', id: row.id, status },
      {
        onSuccess: () => {
          setNotice(
            status === 'published'
              ? `"${row.title}" ya la ven las familias.`
              : status === 'archived'
                ? `"${row.title}" quedó oculta.`
                : `"${row.title}" quedó para revisar.`,
          );
        },
      },
    );
  };

  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Contenidos</Text>
      {withoutMfa ? (
        <Banner tone="info" title="Demo">
          Lo que publiques acá lo ven las familias.
        </Banner>
      ) : null}
      {withoutMfa && otherAdmin ? (
        <Link href="/perfil" asChild>
          <Button label="Activar la verificación en dos pasos" variant="secondary" />
        </Link>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/admin/contenidos/nueva-actividad" asChild>
          <Button label="Nueva actividad" icon={ListPlus} />
        </Link>
        <Link href="/admin/contenidos/nueva-ficha" asChild>
          <Button label="Nueva ficha" icon={FilePlus} variant="secondary" />
        </Link>
        <Link href="/admin/contenidos/nueva-fuente" asChild>
          <Button label="Nueva fuente" icon={BookPlus} variant="secondary" />
        </Link>
      </View>
      <ChipGroup
        label="Sección"
        options={TABS}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setNotice(null);
        }}
      />
      <TextField
        label="Buscar"
        value={query}
        onChangeText={setQuery}
        placeholder="Escribí parte del nombre"
        returnKeyType="search"
        accessibilityHint="Filtra la lista mientras escribís"
      />
      {notice ? (
        <Banner tone="success" icon={CircleCheck}>
          {notice}
        </Banner>
      ) : null}
      {(setStatus.error ?? publishVersion.error) ? (
        <Banner tone="danger">{friendlyError(setStatus.error ?? publishVersion.error)}</Banner>
      ) : null}

      {tab === 'source' && sources.isPending ? <Skeleton height={200} /> : null}
      {tab === 'source' && sources.isError ? (
        <ErrorState onRetry={() => void sources.refetch()} />
      ) : null}
      {tab === 'source' && !sources.isSuccess
        ? null
        : shownCount === 0 && (
            <Text tone="muted">
              {q === '' ? 'Todavía no hay nada acá.' : 'No hay coincidencias.'}
            </Text>
          )}

      {tab === 'source'
        ? shownSources.map((source) => (
            <Card key={source.id}>
              <Text>{source.citation}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Badge
                  tone={source.verification_status === 'verified' ? 'primary' : 'neutral'}
                  icon={source.verification_status === 'verified' ? CircleCheck : Clock}
                >
                  {source.verification_status === 'verified' ? 'Verificada' : 'Sin verificar'}
                </Badge>
              </View>
            </Card>
          ))
        : null}
      {tab === 'questionnaire'
        ? shownVersions.map((v) => {
            const status = STATUS[v.status] ?? { label: v.status, icon: Pencil };
            return (
              <Card key={v.id}>
                <Text variant="subheading">{`${v.questionnaires.title} (versión ${String(v.version)})`}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Badge tone={v.status === 'published' ? 'primary' : 'neutral'} icon={status.icon}>
                    {status.label}
                  </Badge>
                </View>
                {v.status === 'draft' && canPublish && !withoutMfa ? (
                  <ConfirmAction
                    label="Publicar esta versión"
                    confirmLabel="Sí, publicar"
                    description="Las familias van a empezar a responder esta versión."
                    loading={publishVersion.isPending}
                    onConfirm={() => {
                      setNotice(null);
                      publishVersion.mutate(v.id, {
                        onSuccess: () => {
                          setNotice(`"${v.questionnaires.title}" quedó publicado.`);
                        },
                      });
                    }}
                  />
                ) : null}
              </Card>
            );
          })
        : null}
      {tab === 'activity' || tab === 'content'
        ? shownRows.map((row) => (
            <ContentRow
              key={row.id}
              row={row}
              canPublish={canPublish}
              busy={setStatus.isPending && setStatus.variables.id === row.id}
              onStatus={(status) => {
                changeStatus(row, status);
              }}
            />
          ))
        : null}
    </Screen>
  );
}
