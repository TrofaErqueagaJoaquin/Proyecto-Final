import type { QuestionnaireDefinition, ScoringSpec } from '@crecer/domain';
import { Link } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { BAND_LABELS } from '@/features/assessments/labels';
import { useAttemptResult } from '@/features/assessments/queries';
import { BroteSays } from '@/features/brote/Brote';
import { feedback } from '@/features/feedback/feedback';
import { Badge, Button, Card, ErrorState, makeStyles, Skeleton, Text } from '@/ui';

import { Confetti } from './Confetti';

const ORDER = { priority: 0, watch: 1, strength: 2 } as const;

const useStyles = makeStyles((t) => ({
  today: {
    backgroundColor: t.colors.mintSoft,
    borderRadius: t.radius.lg,
    padding: t.space.xl,
    gap: t.space.md,
    borderWidth: 2,
    borderColor: t.colors.mint,
  },
}));

/**
 * Resultado del chequeo: festejo, lo que está bien, por dónde empezar y una actividad para hoy.
 * El detalle completo queda en el resultado de siempre.
 */
export function CheckResult({
  attemptId,
  alias,
  definition,
  spec,
}: {
  attemptId: string;
  alias: string;
  definition: QuestionnaireDefinition;
  spec: ScoringSpec;
}) {
  const styles = useStyles();
  const result = useAttemptResult(attemptId);
  // Llega el resultado → saltito de Brote, confeti, sonido y vibración (una vez).
  const celebrate = result.data ? 1 : 0;
  useEffect(() => {
    if (celebrate) feedback('achievement');
  }, [celebrate]);

  if (result.isPending) return <Skeleton height={280} />;
  if (result.isError) return <ErrorState onRetry={() => void result.refetch()} />;

  const scores = [...result.data.scores].sort(
    (a, b) => ORDER[a.band as keyof typeof ORDER] - ORDER[b.band as keyof typeof ORDER],
  );
  const title = (code: string) => definition.sections.find((s) => s.code === code)?.title ?? code;
  const text = (code: string, band: string) =>
    spec.dimensions.find((d) => d.code === code)?.texts[band as keyof typeof BAND_LABELS] ?? '';
  const start = scores.find((s) => s.band !== 'strength');
  const strength = scores.find((s) => s.band === 'strength');
  const activity = result.data.recommendations.find((r) => r.activities)?.activities;

  return (
    <View style={{ gap: 16 }}>
      <Confetti trigger={celebrate} />
      <BroteSays mood="feliz" size={104} celebrate={celebrate}>
        {`¡Listo! Ya conozco un poco más a ${alias}.`}
      </BroteSays>

      {strength ? (
        <Card>
          <Badge tone="primary">{`${BAND_LABELS.strength} · ${title(strength.dimension_code)}`}</Badge>
          <Text>{text(strength.dimension_code, 'strength')}</Text>
        </Card>
      ) : null}

      {start ? (
        <Card>
          <Badge tone="caution">{`${BAND_LABELS.priority} · ${title(start.dimension_code)}`}</Badge>
          <Text>{text(start.dimension_code, start.band)}</Text>
        </Card>
      ) : null}

      {activity ? (
        <View style={styles.today}>
          <Text variant="label">PARA HOY</Text>
          <Text variant="heading">{activity.title}</Text>
          <Link href={`/actividades/${activity.slug}`} asChild>
            <Button label="¡Vamos!" fullWidth />
          </Link>
        </View>
      ) : null}

      <Link href="/hoy" asChild>
        <Button label="Ir a mi día" variant="secondary" fullWidth />
      </Link>
      <Link href={`/evaluaciones/${attemptId}/resultado`} asChild>
        <Button label="Ver el detalle" variant="ghost" />
      </Link>
      <Text variant="small" tone="muted" center>
        Es una orientación, no un diagnóstico.
      </Text>
    </View>
  );
}
