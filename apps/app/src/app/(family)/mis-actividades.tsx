import { Link } from 'expo-router';
import { Bookmark, CircleCheck, Clock, Puzzle } from 'lucide-react-native';
import { View } from 'react-native';

import { useActiveFamily } from '@/features/families/queries';
import { ActivityIcon } from '@/features/library/activityVisuals';
import { LinkCard } from '@/features/library/LinkCard';
import { useActivityLogs, useSavedActivities } from '@/features/library/queries';
import { Badge, Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/ui';

export default function MyActivitiesScreen() {
  const { isPending, family } = useActiveFamily();
  const saved = useSavedActivities(family?.id);
  const logs = useActivityLogs(family?.id);

  if (isPending) return <Skeleton height={300} />;

  return (
    <Screen>
      <Text variant="title">Actividades</Text>
      <Link href="/actividades" asChild>
        <Button label="Explorar el catálogo" icon={Puzzle} />
      </Link>

      {!family ? (
        <Card>
          <EmptyState
            icon={Bookmark}
            title="Creá tu familia para guardar actividades"
            action={
              <Link href="/familia/nueva" asChild>
                <Button label="Crear mi familia" variant="secondary" />
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <Text variant="heading">Guardadas</Text>
          {saved.isPending ? (
            <Skeleton height={120} />
          ) : saved.isError ? (
            <ErrorState onRetry={() => void saved.refetch()} />
          ) : saved.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={Bookmark}
                title="Todavía no guardaron actividades"
                description="Tocá Guardar en una actividad para tenerla a mano."
              />
            </Card>
          ) : (
            saved.data.map((s) =>
              s.activities ? (
                <LinkCard
                  key={s.activity_id}
                  href={`/actividades/${s.activities.slug}`}
                  title={s.activities.title}
                  description={s.activities.summary}
                  leading={
                    <ActivityIcon
                      categories={s.activities.activity_category_links.map((l) => l.category_code)}
                    />
                  }
                  footer={<Badge icon={Clock}>{`${String(s.activities.duration_min)} min`}</Badge>}
                />
              ) : null,
            )
          )}

          <Text variant="heading">Lo que hicieron</Text>
          {logs.isPending ? (
            <Skeleton height={120} />
          ) : logs.isError ? (
            <ErrorState onRetry={() => void logs.refetch()} />
          ) : logs.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={CircleCheck}
                title="Todavía no registraron actividades"
                description="Cuando hagan una, tocá La hicimos para llevar la cuenta."
              />
            </Card>
          ) : (
            <Card>
              {logs.data.map((log) => (
                <View key={log.id} style={{ gap: 2, paddingVertical: 6 }}>
                  <Text variant="bodyStrong">{log.activities?.title ?? 'Actividad'}</Text>
                  <Text variant="small" tone="muted">
                    {new Date(`${log.done_on}T12:00:00`).toLocaleDateString('es-AR')}
                    {log.activity_log_participants.length > 0
                      ? ` · con ${log.activity_log_participants
                          .map((p) => p.family_members?.alias)
                          .filter(Boolean)
                          .join(', ')}`
                      : ''}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
