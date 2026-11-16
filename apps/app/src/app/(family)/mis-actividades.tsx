import { Link } from 'expo-router';
import { Bookmark, CalendarDays, CircleCheck, Clock, Puzzle, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { useActiveFamily } from '@/features/families/queries';
import { ActivityGrid } from '@/features/library/ActivityTile';
import { LinkCard } from '@/features/library/LinkCard';
import { useActivityLogs, useSavedActivities } from '@/features/library/queries';
import { Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text, useTheme } from '@/ui';

export default function MyActivitiesScreen() {
  const { isPending, family } = useActiveFamily();
  const saved = useSavedActivities(family?.id);
  const logs = useActivityLogs(family?.id);
  const { colors } = useTheme();

  if (isPending) return <Skeleton height={300} />;

  return (
    <Screen>
      <Text variant="title">Actividades</Text>
      {family ? (
        <>
          <LinkCard
            href="/plan"
            title="Plan de la semana"
            description="De 5 a 7 ideas posibles con su tiempo y su espacio."
            leading={<CalendarDays size={28} color={colors.primary} aria-hidden />}
          />
          <LinkCard
            href="/objetivos"
            title="Objetivos"
            description="Lo que se propusieron como familia y cómo vienen."
            leading={<Target size={28} color={colors.primary} aria-hidden />}
          />
        </>
      ) : null}
      <Link href="/actividades" asChild>
        <Button label="Explorar el catálogo" icon={Puzzle} variant="secondary" />
      </Link>

      {!family ? (
        <Card>
          <EmptyState
            icon={Bookmark}
            title="Creá tu familia para armar tu lista"
            action={
              <Link href="/bienvenida" asChild>
                <Button label="Crear mi familia" variant="secondary" />
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <Text variant="heading">Para hacer</Text>
          {saved.isPending ? (
            <Skeleton height={120} />
          ) : saved.isError ? (
            <ErrorState onRetry={() => void saved.refetch()} />
          ) : saved.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={Clock}
                title="Tu lista está vacía"
                description="En una actividad, tocá Hacer más tarde."
              />
            </Card>
          ) : (
            <ActivityGrid
              activities={saved.data.flatMap((s) =>
                s.activities
                  ? [
                      {
                        slug: s.activities.slug,
                        title: s.activities.title,
                        categories: s.activities.activity_category_links.map(
                          (l) => l.category_code,
                        ),
                      },
                    ]
                  : [],
              )}
              maxContent={720}
            />
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
                description="Cuando hagan una, tocá Realizado."
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
