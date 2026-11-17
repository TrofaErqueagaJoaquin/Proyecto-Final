import { Link } from 'expo-router';
import { CalendarDays, Puzzle, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ActivityScene, sceneFor } from '@/features/animations';
import { BroteEmptyState } from '@/features/brote/Brote';
import { feedback } from '@/features/feedback/feedback';
import { useActiveFamily } from '@/features/families/queries';
import { useActivityFlow } from '@/features/library/ActivityFlow';
import { ActivityGrid } from '@/features/library/ActivityTile';
import { IconGrid, IconTile, useColumnWidth } from '@/features/library/IconTile';
import { useActivityLogs, useSavedActivities } from '@/features/library/queries';
import { Button, Card, ErrorState, LoadingScreen, makeStyles, Screen, Skeleton, Text } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

/** Cuántas de "Lo que hicieron" se ven antes de tocar "Ver todo". */
const RECENT = 5;

const useStyles = makeStyles((t) => ({
  log: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: minTouchTarget,
    paddingVertical: t.space.xs,
  },
}));

type Log = NonNullable<ReturnType<typeof useActivityLogs>['data']>[number];

function participants(log: Log): string {
  const names = log.activity_log_participants
    .map((p) => p.family_members?.alias)
    .filter(Boolean)
    .join(', ');
  return names ? ` · con ${names}` : '';
}

/** Una actividad hecha: el dibujo, el nombre y la fecha. Al tocarla se abre su detalle. */
function LogRow({ log }: { log: Log }) {
  const styles = useStyles();
  const flow = useActivityFlow();
  const activity = log.activities;
  const title = activity?.title ?? 'Actividad';
  const date = new Date(`${log.done_on}T12:00:00`).toLocaleDateString('es-AR');
  const content = (
    <>
      <ActivityScene scene={sceneFor(activity?.slug ?? '')} width={72} label="" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" tone="muted">
          {`${date}${participants(log)}`}
        </Text>
      </View>
    </>
  );
  if (!activity) return <View style={styles.log}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${date}`}
      style={({ pressed }) => [styles.log, { opacity: pressed ? 0.7 : 1 }]}
      onPress={() => {
        feedback('tap');
        flow.open(activity.slug, activity.title);
      }}
    >
      {content}
    </Pressable>
  );
}

export default function MyActivitiesScreen() {
  const { isPending, family } = useActiveFamily();
  const saved = useSavedActivities(family?.id);
  const logs = useActivityLogs(family?.id);
  const [showAll, setShowAll] = useState(false);
  const tileWidth = useColumnWidth(720, { phone: 3, tablet: 3, desktop: 3 });

  if (isPending) return <LoadingScreen />;

  return (
    <Screen>
      <Text variant="title">Actividades</Text>
      <IconGrid>
        {family ? (
          <>
            <IconTile
              visual={{ icon: CalendarDays, tone: 'primary' }}
              title="Plan de la semana"
              href="/plan"
              width={tileWidth}
              iconSize={48}
            />
            <IconTile
              visual={{ icon: Target, tone: 'success' }}
              title="Objetivos"
              href="/objetivos"
              width={tileWidth}
              iconSize={48}
            />
          </>
        ) : null}
        <IconTile
          visual={{ icon: Puzzle, tone: 'caution' }}
          title="Explorar actividades"
          href="/catalogo"
          width={tileWidth}
          iconSize={48}
          grow={!family}
        />
      </IconGrid>

      {!family ? (
        <Card>
          <BroteEmptyState
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
            <ErrorState error={saved.error} onRetry={() => void saved.refetch()} />
          ) : saved.data.length === 0 ? (
            <Card>
              <BroteEmptyState
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
            <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
          ) : logs.data.length === 0 ? (
            <Card>
              <BroteEmptyState
                title="Todavía no registraron actividades"
                description="Cuando hagan una, tocá Realizado."
              />
            </Card>
          ) : (
            <Card>
              {(showAll ? logs.data : logs.data.slice(0, RECENT)).map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
              {logs.data.length > RECENT ? (
                <Button
                  label={showAll ? 'Ver menos' : 'Ver todo'}
                  variant="ghost"
                  onPress={() => {
                    setShowAll((value) => !value);
                  }}
                />
              ) : null}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
