import { answersFromRows, formatAge, type Band, type Contribution } from '@crecer/domain';
import { Link, useLocalSearchParams } from 'expo-router';
import { ClipboardList, History } from 'lucide-react-native';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  BAND_LABELS,
  contentHref,
  describeChange,
  RECOMMENDATION_STATUS_LABELS,
  weighedAnswers,
  type RecommendationStatus,
} from '@/features/assessments/labels';
import {
  useAnswers,
  useAttempt,
  useAttemptResult,
  useMemberHistory,
  useQuestionnaireVersion,
  useUpdateRecommendation,
} from '@/features/assessments/queries';
import { TextLink } from '@/features/auth/components';
import { LinkCard } from '@/features/library/LinkCard';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  EvidenceChip,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

const STATUS_ACTIONS: { status: RecommendationStatus; label: string }[] = [
  { status: 'accepted', label: 'La vamos a probar' },
  { status: 'done', label: 'Ya la hicimos' },
  { status: 'dismissed', label: 'No es para nosotros' },
];

/** Dimensiones sin puntaje (por la edad o sin respuestas suficientes). */
const NO_SCORE_TEXT: Record<string, string> = {
  pantalla_tiempo:
    'A esta edad no hay una pauta de horas: lo miramos junto con cómo se usan las pantallas.',
};

export default function ResultScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const attempt = useAttempt(attemptId);
  const version = useQuestionnaireVersion(attempt.data?.version_id);
  const result = useAttemptResult(attemptId);
  const answers = useAnswers(attemptId);
  const history = useMemberHistory(attempt.data?.member_id);
  const update = useUpdateRecommendation(attemptId);

  if (
    attempt.isPending ||
    result.isPending ||
    answers.isPending ||
    (attempt.data && (version.isPending || history.isPending))
  ) {
    return (
      <Screen>
        <Skeleton height={36} width="60%" />
        <Skeleton height={320} />
      </Screen>
    );
  }
  if (attempt.isError || result.isError || answers.isError || version.isError || history.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void attempt.refetch();
          void result.refetch();
        }}
      />
    );
  }
  if (!attempt.data || !version.data || attempt.data.status !== 'submitted') {
    return (
      <Screen>
        <EmptyState
          icon={ClipboardList}
          title="Este resultado no está disponible"
          description="Puede que la evaluación todavía no se haya enviado."
        />
      </Screen>
    );
  }

  const { definition, spec } = version.data;
  const inputs = answersFromRows(
    definition,
    answers.data.map((r) => ({
      questionId: r.question_id,
      optionId: r.option_id,
      valueNumber: r.value_number,
    })),
  );
  const scores = new Map(result.data.scores.map((s) => [s.dimension_code, s]));
  const attempts = history.data ?? [];
  const index = attempts.findIndex((a) => a.id === attemptId);
  const previous = index > 0 ? attempts[index - 1] : undefined;
  const previousBands = new Map(
    previous?.assessment_dimension_scores.map((s) => [s.dimension_code, s.band as Band]),
  );
  const changes = definition.sections
    .map((s) =>
      describeChange(
        s.title,
        previousBands.get(s.code),
        scores.get(s.code)?.band as Band | undefined,
      ),
    )
    .filter((text): text is string => text !== null);
  const alias = attempt.data.family_members?.alias ?? '';

  return (
    <Screen>
      <Text variant="title">{`Resultado de ${alias}`}</Text>
      <Text tone="muted">
        {`${new Date(attempt.data.submitted_at ?? '').toLocaleDateString('es-AR')} · cuando tenía ${formatAge(attempt.data.member_age_months)}`}
      </Text>

      {changes.length > 0 && previous ? (
        <Card>
          <Text variant="subheading">
            {`Comparado con la evaluación del ${new Date(previous.submitted_at ?? '').toLocaleDateString('es-AR')}`}
          </Text>
          {changes.map((text) => (
            <Text key={text}>• {text}</Text>
          ))}
        </Card>
      ) : null}

      {definition.sections.map((section) => {
        const score = scores.get(section.code);
        if (!score) {
          const reason = NO_SCORE_TEXT[section.code];
          return reason && spec.dimensions.some((d) => d.code === section.code) ? (
            <Card key={section.code}>
              <Text variant="subheading">{section.title}</Text>
              <Text tone="muted">{reason}</Text>
            </Card>
          ) : null;
        }
        const band = score.band as Band;
        const texts = spec.dimensions.find((d) => d.code === section.code)?.texts;
        const weighed = weighedAnswers(
          definition,
          inputs,
          score.explanation as unknown as Contribution[],
        );
        return (
          <Card key={section.code}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Text variant="subheading">{section.title}</Text>
              <Badge
                tone={band === 'strength' ? 'primary' : band === 'watch' ? 'neutral' : 'caution'}
              >
                {BAND_LABELS[band]}
              </Badge>
            </View>
            {texts ? <Text>{texts[band]}</Text> : null}
            {weighed.length > 0 ? (
              <View style={{ gap: 4 }}>
                <Text variant="label">Qué pesó</Text>
                {weighed.map((w) => (
                  <Text key={w.question} variant="small">
                    {`• ${w.prompt} `}
                    <Text variant="small" tone="muted">
                      {w.answer}
                    </Text>
                  </Text>
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}

      <Text variant="heading">Para probar</Text>
      {update.error ? <Banner tone="danger">{friendlyError(update.error)}</Banner> : null}
      {result.data.recommendations.map((rec) => {
        const target = rec.activities
          ? {
              href: `/actividades/${rec.activities.slug}`,
              title: rec.activities.title,
              evidence: rec.activities.evidence_label,
            }
          : rec.content_items
            ? {
                href: contentHref(rec.content_items.type, rec.content_items.slug),
                title: rec.content_items.title,
                evidence: rec.content_items.evidence_label,
              }
            : null;
        if (!target) return null;
        const status = rec.status as RecommendationStatus;
        return (
          <View key={rec.id} style={{ gap: 8 }}>
            {target.href ? (
              <LinkCard
                href={target.href}
                title={target.title}
                description={`Por qué: ${rec.reason}`}
                footer={<EvidenceChip label={target.evidence} />}
              />
            ) : (
              <Card>
                <Text variant="subheading">{target.title}</Text>
                <Text>{`Por qué: ${rec.reason}`}</Text>
              </Card>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {status !== 'new' ? (
                <Badge tone="primary">{RECOMMENDATION_STATUS_LABELS[status]}</Badge>
              ) : null}
              {STATUS_ACTIONS.filter((a) => a.status !== status).map((action) => (
                <Button
                  key={action.status}
                  label={action.label}
                  variant="ghost"
                  disabled={update.isPending}
                  onPress={() => {
                    update.mutate({ id: rec.id, status: action.status });
                  }}
                />
              ))}
            </View>
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={`/evaluaciones/historial/${attempt.data.member_id}`} asChild>
          <Button label="Ver el historial" icon={History} variant="secondary" />
        </Link>
        <Link href="/evaluaciones" asChild>
          <Button label="Volver a Evaluaciones" variant="ghost" />
        </Link>
      </View>

      <Banner tone="info" title="Es una orientación, no un diagnóstico">
        Este cuestionario es una propuesta del proyecto basada en guías de la OMS, la SAP y la AAP,
        y está pendiente de revisión profesional. Las bandas son orientativas.
      </Banner>
      <Text variant="small" tone="muted">
        Si algo te preocupa, mirá <TextLink href="/cuando-consultar">cuándo consultar</TextLink>.
      </Text>
    </Screen>
  );
}
