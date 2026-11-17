import { answersFromRows, formatAge, type Band, type Contribution } from '@crecer/domain';
import { Link, useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronRight, History } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

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
} from '@/features/assessments/queries';
import { TextLink } from '@/features/auth/components';
import { BroteEmptyState, BroteSays } from '@/features/brote/Brote';
import { ActivityTile, useTileWidth } from '@/features/library/ActivityTile';
import { LinkCard } from '@/features/library/LinkCard';
import {
  Badge,
  Button,
  Disclosure,
  ErrorState,
  makeStyles,
  Screen,
  Sheet,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

/** Dimensiones sin puntaje (por la edad o sin respuestas suficientes). */
const NO_SCORE_TEXT: Record<string, string> = {
  pantalla_tiempo:
    'A esta edad no hay una pauta de horas: lo miramos junto con cómo se usan las pantallas.',
};

const BAND_TONE: Record<Band, 'primary' | 'neutral' | 'caution'> = {
  strength: 'primary',
  watch: 'neutral',
  priority: 'caution',
};

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  theme: {
    minHeight: minTouchTarget + 48,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    padding: t.space.md,
    gap: t.space.sm,
    justifyContent: 'space-between',
  },
  themeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.xs },
}));

interface ThemeDetail {
  title: string;
  band: Band | null;
  text: string;
  change: string | null;
  weighed: { question: string; prompt: string; answer: string }[];
}

export default function ResultScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const tileWidth = useTileWidth();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const attempt = useAttempt(attemptId);
  const version = useQuestionnaireVersion(attempt.data?.version_id);
  const result = useAttemptResult(attemptId);
  const answers = useAnswers(attemptId);
  const history = useMemberHistory(attempt.data?.member_id);
  const [opened, setOpened] = useState<ThemeDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
        error={attempt.error ?? result.error ?? answers.error ?? version.error ?? history.error}
        onRetry={() => {
          void attempt.refetch();
          void result.refetch();
          void answers.refetch();
          void version.refetch();
          void history.refetch();
        }}
      />
    );
  }
  if (!attempt.data || !version.data || attempt.data.status !== 'submitted') {
    return (
      <Screen>
        <BroteEmptyState
          title="Este resultado todavía no está"
          description="Puede que el chequeo no se haya terminado."
          action={
            <Link href="/evaluaciones" asChild>
              <Button label="Ir a mis chequeos" />
            </Link>
          }
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
  const alias = attempt.data.family_members?.alias ?? '';

  // Un tema por tarjeta: los que tienen puntaje y los que se explican sin puntaje.
  const themes = definition.sections.flatMap((section): ThemeDetail[] => {
    const score = scores.get(section.code);
    if (!score) {
      const reason = NO_SCORE_TEXT[section.code];
      return reason && spec.dimensions.some((d) => d.code === section.code)
        ? [{ title: section.title, band: null, text: reason, change: null, weighed: [] }]
        : [];
    }
    const band = score.band as Band;
    return [
      {
        title: section.title,
        band,
        text: spec.dimensions.find((d) => d.code === section.code)?.texts[band] ?? '',
        change: previous
          ? describeChange(section.title, previousBands.get(section.code), band)
          : null,
        weighed: weighedAnswers(definition, inputs, score.explanation as unknown as Contribution[]),
      },
    ];
  });

  const recommendations = result.data.recommendations;
  const activities = recommendations.flatMap((rec) =>
    rec.activities
      ? [{ rec, activity: { slug: rec.activities.slug, title: rec.activities.title } }]
      : [],
  );
  const readings = recommendations.flatMap((rec) => {
    const item = rec.content_items;
    const href = item ? contentHref(item.type, item.slug) : null;
    return item && href ? [{ rec, href, title: item.title }] : [];
  });
  const statusBadge = (status: string) =>
    status !== 'new' ? (
      <Badge tone="primary">{RECOMMENDATION_STATUS_LABELS[status as RecommendationStatus]}</Badge>
    ) : undefined;

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">{`Resultado de ${alias}`}</Text>
      <Text variant="small" tone="muted">
        {`${new Date(attempt.data.submitted_at ?? '').toLocaleDateString('es-AR')} · cuando tenía ${formatAge(attempt.data.member_age_months)}`}
      </Text>

      <View style={styles.grid}>
        {themes.map((theme) => (
          <Pressable
            key={theme.title}
            accessibilityRole="button"
            accessibilityLabel={
              theme.band ? `${theme.title}: ${BAND_LABELS[theme.band]}` : theme.title
            }
            accessibilityHint="Abre el detalle"
            style={({ pressed }) => [
              styles.theme,
              { width: tileWidth, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={() => {
              setOpened(theme);
              setSheetOpen(true);
            }}
          >
            <View style={styles.themeTop}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {theme.title}
              </Text>
              <ChevronRight color={colors.inkMuted} size={20} aria-hidden />
            </View>
            {theme.band ? (
              <Badge tone={BAND_TONE[theme.band]}>{BAND_LABELS[theme.band]}</Badge>
            ) : (
              <Badge>Sin puntaje</Badge>
            )}
          </Pressable>
        ))}
      </View>

      {activities.length > 0 ? (
        <>
          <BroteSays mood="feliz">{`Para probar con ${alias}:`}</BroteSays>
          <View style={styles.grid}>
            {activities.map(({ rec, activity }) => (
              <ActivityTile
                key={rec.id}
                activity={{ ...activity, categories: [] }}
                width={tileWidth}
                badge={statusBadge(rec.status)}
              />
            ))}
          </View>
        </>
      ) : null}
      {readings.map(({ rec, href, title }) => (
        <LinkCard key={rec.id} href={href} title={title} footer={statusBadge(rec.status)} />
      ))}

      <Link href="/plan" asChild>
        <Button label="Armar el plan de la semana" icon={CalendarDays} fullWidth />
      </Link>
      {attempts.length > 1 ? (
        <Link href={`/evaluaciones/historial/${attempt.data.member_id}`} asChild>
          <Button label="Ver chequeos anteriores" icon={History} variant="ghost" />
        </Link>
      ) : null}

      <Disclosure title="Es una orientación, no un diagnóstico">
        <Text>
          Este chequeo es una propuesta del proyecto basada en guías de la OMS, la SAP y la AAP, y
          está pendiente de revisión profesional. Los resultados son orientativos.
        </Text>
        <Text>
          Si algo te preocupa, mirá <TextLink href="/cuando-consultar">cuándo consultar</TextLink>.
        </Text>
      </Disclosure>

      <Sheet
        visible={sheetOpen}
        title={opened?.title}
        onClose={() => {
          setSheetOpen(false);
        }}
      >
        {opened ? (
          <>
            {opened.band ? (
              <Badge tone={BAND_TONE[opened.band]}>{BAND_LABELS[opened.band]}</Badge>
            ) : null}
            {opened.text ? <Text>{opened.text}</Text> : null}
            {opened.change ? <Text tone="muted">{opened.change}</Text> : null}
            {opened.weighed.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text variant="label">Qué pesó</Text>
                {opened.weighed.map((w) => (
                  <Text key={w.question}>
                    {`• ${w.prompt.replace('{alias}', alias)} `}
                    <Text tone="muted">{w.answer}</Text>
                  </Text>
                ))}
              </View>
            ) : null}
            <Button
              label="Entendido"
              fullWidth
              onPress={() => {
                setSheetOpen(false);
              }}
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
