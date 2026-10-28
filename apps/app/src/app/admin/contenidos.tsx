import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  useAdminContent,
  usePermissions,
  usePublishQuestionnaire,
  useSetContentStatus,
} from '@/features/admin/queries';
import { Badge, Banner, Button, Card, ChipGroup, ErrorState, Screen, Skeleton, Text } from '@/ui';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  published: 'Publicado',
  archived: 'Archivado',
  retired: 'Retirado',
};
const TABS = [
  { value: 'content', label: 'Contenidos' },
  { value: 'activity', label: 'Actividades' },
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

/** Contenidos, actividades y cuestionarios: estado y publicación (la edición completa es P1). */
export default function ContentAdminScreen() {
  const permissions = usePermissions();
  const content = useAdminContent();
  const setStatus = useSetContentStatus();
  const publishVersion = usePublishQuestionnaire();
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('content');
  const canPublish = permissions.has('content.publish');

  if (content.isPending) return <Skeleton height={300} />;
  if (content.isError) return <ErrorState onRetry={() => void content.refetch()} />;

  const rows =
    tab === 'content'
      ? content.data.content.map((c) => ({
          id: c.id,
          title: c.title,
          sub: `${c.type} · ${c.slug}`,
          status: c.status,
        }))
      : tab === 'activity'
        ? content.data.activities.map((a) => ({
            id: a.id,
            title: a.title,
            sub: a.slug,
            status: a.status,
          }))
        : [];

  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Contenidos</Text>
      <Text tone="muted">
        En desarrollo, `content/` es la fuente de verdad: `pnpm content:sync` vuelve a cargar lo del
        repositorio (ADR-014).
      </Text>
      <ChipGroup label="Sección" options={TABS} value={tab} onChange={setTab} />
      {(setStatus.error ?? publishVersion.error) ? (
        <Banner tone="danger">{friendlyError(setStatus.error ?? publishVersion.error)}</Banner>
      ) : null}

      {tab === 'questionnaire'
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
              {v.status === 'draft' && canPublish ? (
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
              </View>
              <Text variant="small" tone="muted">
                {row.sub}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {actionsFor(row.status, canPublish).map((action) => (
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
                ))}
              </View>
            </Card>
          ))}
    </Screen>
  );
}
