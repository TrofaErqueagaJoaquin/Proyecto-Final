import { Link } from 'expo-router';
import { BookPlus, FilePlus, ListPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  useAdminContent,
  useAdminSources,
  usePermissions,
  usePublishQuestionnaire,
  useSetContentStatus,
} from '@/features/admin/queries';
import { useMfaStatus } from '@/features/auth/mfa';
import { Badge, Banner, Button, Card, ChipGroup, ErrorState, Screen, Skeleton, Text } from '@/ui';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  published: 'Publicado',
  archived: 'Archivado',
  retired: 'Retirado',
};
const TABS = [
  { value: 'activity', label: 'Actividades' },
  { value: 'content', label: 'Fichas' },
  { value: 'source', label: 'Fuentes' },
  { value: 'questionnaire', label: 'Cuestionarios' },
] as const;

/** Acciones posibles según el estado y el permiso (un editor no publica). */
function actionsFor(status: string, canPublish: boolean): { status: string; label: string }[] {
  const actions: { status: string; label: string }[] = [];
  if (status === 'draft') actions.push({ status: 'in_review', label: 'Enviar a revisión' });
  if (status === 'in_review') actions.push({ status: 'draft', label: 'Volver a borrador' });
  if (canPublish && status !== 'published')
    actions.push({ status: 'published', label: 'Publicar' });
  if (canPublish && status === 'published') actions.push({ status: 'archived', label: 'Archivar' });
  return actions;
}

/**
 * Contenidos: cargar actividades, fichas y fuentes nuevas (ADR-036), y cambiar su estado. Lo del
 * repositorio lo carga `pnpm content:sync`; lo cargado acá queda marcado "Del panel" y la
 * sincronización no lo toca.
 */
export default function ContentAdminScreen() {
  const permissions = usePermissions();
  const content = useAdminContent();
  const sources = useAdminSources();
  const mfa = useMfaStatus();
  const setStatus = useSetContentStatus();
  const publishVersion = usePublishQuestionnaire();
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('activity');
  const canPublish = permissions.has('content.publish');
  // Sin segundo factor (solo pasa en la demo) se toca únicamente lo cargado en el panel.
  const withoutMfa = mfa.data !== undefined && mfa.data.level !== 'aal2';
  const otherAdmin = [...permissions].some((p) => !p.startsWith('content.'));

  if (content.isPending) return <Skeleton height={300} />;
  if (content.isError) return <ErrorState onRetry={() => void content.refetch()} />;

  const rows =
    tab === 'content'
      ? content.data.content.map((c) => ({
          id: c.id,
          title: c.title,
          sub: `${c.type} · ${c.slug}`,
          status: c.status,
          panel: c.origin === 'panel',
        }))
      : tab === 'activity'
        ? content.data.activities.map((a) => ({
            id: a.id,
            title: a.title,
            sub: a.slug,
            status: a.status,
            panel: a.origin === 'panel',
          }))
        : [];

  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Contenidos</Text>
      {withoutMfa ? (
        <Banner tone="info" title="Demo">
          {`Cargás y publicás contenido nuevo sin el código del teléfono. Lo que viene del repositorio, los cuestionarios y el resto de la administración lo siguen pidiendo.${otherAdmin ? ' Para usar las demás secciones, activá la verificación en Perfil.' : ''}`}
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
      <Text tone="muted">
        Lo del repositorio se carga con `pnpm content:sync`. Lo que cargás acá queda marcado «Del
        panel» y la sincronización no lo toca.
      </Text>
      <ChipGroup label="Sección" options={TABS} value={tab} onChange={setTab} />
      {(setStatus.error ?? publishVersion.error) ? (
        <Banner tone="danger">{friendlyError(setStatus.error ?? publishVersion.error)}</Banner>
      ) : null}

      {tab === 'source' && sources.isPending ? <Skeleton height={200} /> : null}
      {tab === 'source' && sources.isError ? (
        <ErrorState onRetry={() => void sources.refetch()} />
      ) : null}
      {tab === 'source'
        ? (sources.data ?? []).map((source) => (
            <Card key={source.id}>
              <Text>{source.citation}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Badge tone={source.verification_status === 'verified' ? 'primary' : 'neutral'}>
                  {source.verification_status === 'verified' ? 'Verificada' : 'Sin verificar'}
                </Badge>
                {source.origin === 'panel' ? <Badge tone="neutral">Del panel</Badge> : null}
              </View>
            </Card>
          ))
        : null}
      {tab === 'source'
        ? null
        : tab === 'questionnaire'
          ? content.data.versions.map((v) => (
              <Card key={v.id}>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
                >
                  <Text variant="subheading">{`${v.questionnaires.title} · v${String(v.version)}`}</Text>
                  <Badge tone={v.status === 'published' ? 'primary' : 'neutral'}>
                    {STATUS_LABELS[v.status] ?? v.status}
                  </Badge>
                </View>
                {v.status === 'draft' && canPublish && !withoutMfa ? (
                  <Button
                    label="Publicar esta versión"
                    loading={publishVersion.isPending}
                    onPress={() => {
                      publishVersion.mutate(v.id);
                    }}
                  />
                ) : null}
              </Card>
            ))
          : rows.map((row) => (
              <Card key={row.id}>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
                >
                  <Text variant="subheading">{row.title}</Text>
                  <Badge tone={row.status === 'published' ? 'primary' : 'neutral'}>
                    {STATUS_LABELS[row.status] ?? row.status}
                  </Badge>
                  {row.panel ? <Badge tone="neutral">Del panel</Badge> : null}
                </View>
                <Text variant="small" tone="muted">
                  {row.sub}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(withoutMfa && !row.panel ? [] : actionsFor(row.status, canPublish)).map(
                    (action) => (
                      <Button
                        key={action.status}
                        label={action.label}
                        variant={action.status === 'archived' ? 'ghost' : 'secondary'}
                        loading={setStatus.isPending && setStatus.variables.id === row.id}
                        onPress={() => {
                          setStatus.mutate({
                            kind: tab === 'activity' ? 'activity' : 'content',
                            id: row.id,
                            status: action.status,
                          });
                        }}
                      />
                    ),
                  )}
                </View>
              </Card>
            ))}
    </Screen>
  );
}
