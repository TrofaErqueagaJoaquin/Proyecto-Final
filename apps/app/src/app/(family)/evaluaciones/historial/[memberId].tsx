import type { Band } from '@crecer/domain';
import { Link, useLocalSearchParams } from 'expo-router';
import { History } from 'lucide-react-native';
import { View } from 'react-native';

import { BAND_LABELS, describeChange } from '@/features/assessments/labels';
import { useMemberHistory, useQuestionnaireVersion } from '@/features/assessments/queries';
import { LinkCard } from '@/features/library/LinkCard';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  makeStyles,
  Screen,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';

// Puntos conectados, de abajo ("Por dónde empezar") hacia arriba ("Fortaleza").
const LEVEL: Record<Band, number> = { priority: 0, watch: 1, strength: 2 };
const STEP = 18;

const useStyles = makeStyles((t) => ({
  track: { flexDirection: 'row', alignItems: 'flex-end', gap: 0, minHeight: STEP * 2 + 14 },
  point: { alignItems: 'center', width: 64 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: t.colors.accent,
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
  connector: { height: 2, flex: 1, backgroundColor: t.colors.border, alignSelf: 'center' },
}));

function shortDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '';
}

/** Historial de un integrante: una línea por dimensión y el cambio en palabras. */
export default function HistoryScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const history = useMemberHistory(memberId);
  const latest = history.data?.at(-1);
  const version = useQuestionnaireVersion(latest?.version_id);
  const styles = useStyles();
  const { colors } = useTheme();

  if (history.isPending || (latest && version.isPending)) return <Skeleton height={300} />;
  if (history.isError || version.isError) {
    return <ErrorState onRetry={() => void history.refetch()} />;
  }
  if (!latest || !version.data) {
    return (
      <Screen>
        <EmptyState
          icon={History}
          title="Todavía no hay evaluaciones"
          description="Cuando completen la primera, acá van a ver cómo cambia con el tiempo."
          action={
            <Link href="/evaluaciones" asChild>
              <Button label="Ir a Evaluaciones" variant="secondary" />
            </Link>
          }
        />
      </Screen>
    );
  }

  const attempts = history.data;
  const previous = attempts.at(-2);
  const alias = latest.family_members?.alias ?? '';
  const bandOf = (attempt: (typeof attempts)[number] | undefined, code: string) =>
    attempt?.assessment_dimension_scores.find((s) => s.dimension_code === code)?.band as
      Band | undefined;

  return (
    <Screen>
      <Text variant="title">{`Historial de ${alias}`}</Text>
      <Text tone="muted">
        {attempts.length === 1
          ? '1 evaluación. Con la próxima vas a ver la diferencia.'
          : `${String(attempts.length)} evaluaciones.`}
      </Text>

      {version.data.definition.sections.map((section) => {
        const points = attempts
          .map((a) => ({ id: a.id, date: a.submitted_at, band: bandOf(a, section.code) }))
          .filter(
            (p): p is { id: string; date: string | null; band: Band } => p.band !== undefined,
          );
        if (points.length === 0) return null;
        const change = describeChange(
          section.title,
          bandOf(previous, section.code),
          bandOf(latest, section.code),
        );
        return (
          <Card key={section.code}>
            <Text variant="subheading">{section.title}</Text>
            {change ? <Text>{change}</Text> : null}
            <View
              style={styles.track}
              accessibilityLabel={points
                .map((p) => `${shortDate(p.date)}: ${BAND_LABELS[p.band]}`)
                .join('; ')}
              accessible
            >
              {points.map((p, i) => (
                <View key={p.id} style={{ flexDirection: 'row', flex: i === 0 ? 0 : 1 }}>
                  {i > 0 ? <View style={styles.connector} /> : null}
                  <View style={[styles.point, { marginBottom: LEVEL[p.band] * STEP }]}>
                    <View style={styles.dot} />
                    <Text variant="caption" style={{ color: colors.inkMuted }}>
                      {shortDate(p.date)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text variant="small" tone="muted">
              {points.map((p) => BAND_LABELS[p.band]).join(' → ')}
            </Text>
          </Card>
        );
      })}

      <Text variant="heading">Evaluaciones</Text>
      {[...attempts].reverse().map((a) => (
        <LinkCard
          key={a.id}
          href={`/evaluaciones/${a.id}/resultado`}
          title={new Date(a.submitted_at ?? '').toLocaleDateString('es-AR')}
          description="Ver el resultado y las recomendaciones"
        />
      ))}
    </Screen>
  );
}
