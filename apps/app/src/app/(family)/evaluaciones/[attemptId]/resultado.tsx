import { answersFromRows, formatAge, type Band, type Contribution } from '@crecer/domain';
import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import { BookOpen, CalendarDays, ChevronRight, History, Puzzle } from 'lucide-react-native';
import { useId, useState } from 'react';
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
  useUpdateRecommendation,
} from '@/features/assessments/queries';
import { TextLink } from '@/features/auth/components';
import { BroteEmptyState, BroteSays } from '@/features/brote/Brote';
import { useActivityFlow } from '@/features/library/ActivityFlow';
import { ActivityTile, useTileWidth } from '@/features/library/ActivityTile';
import {
  Badge,
  Button,
  Disclosure,
  ErrorBanner,
  ErrorScreen,
  EvidenceChip,
  LoadingScreen,
  makeStyles,
  Screen,
  Sheet,
  Text,
  useOverlayTurn,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

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
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
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
  const themeId = useId();
  const themeVisible = useOverlayTurn(`tema-${themeId}`, sheetOpen);
  // La recomendación abierta (por id: así el estado se ve al día después de cambiarlo).
  const [recId, setRecId] = useState<string | null>(null);
  const [recOpen, setRecOpen] = useState(false);
  const recSheetId = useId();
  const recVisible = useOverlayTurn(`recomendacion-${recSheetId}`, recOpen);
  const update = useUpdateRecommendation(attemptId);
  const flow = useActivityFlow();

  if (
    attempt.isPending ||
    result.isPending ||
    answers.isPending ||
    (attempt.data && (version.isPending || history.isPending))
  ) {
    return <LoadingScreen />;
  }
  if (attempt.isError || result.isError || answers.isError || version.isError || history.isError) {
    return (
      <ErrorScreen
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
  // Todas las fichas, también las que no tienen pantalla propia (se ven en su ventana).
  const readings = recommendations.flatMap((rec) =>
    !rec.activities && rec.content_items ? [{ rec, title: rec.content_items.title }] : [],
  );
  const openRec = (id: string) => {
    setRecId(id);
    setRecOpen(true);
  };
  const shownRec = recommendations.find((rec) => rec.id === recId);
  const shownStatus = shownRec?.status as RecommendationStatus | undefined;
  const shownHref = shownRec?.content_items
    ? contentHref(shownRec.content_items.type, shownRec.content_items.slug)
    : null;
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
                onPress={() => {
                  openRec(rec.id);
                }}
              />
            ))}
          </View>
        </>
      ) : null}
      {readings.map(({ rec, title }) => (
        <Pressable
          key={rec.id}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint="Abre el detalle"
          style={({ pressed }) => [styles.reading, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => {
            openRec(rec.id);
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="subheading">{title}</Text>
            {statusBadge(rec.status)}
          </View>
          <ChevronRight color={colors.inkMuted} size={22} aria-hidden />
        </Pressable>
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
        visible={themeVisible}
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

      {/* Una recomendación: por qué, la evidencia, abrirla y cómo les fue. */}
      <Sheet
        visible={recVisible}
        title={shownRec?.activities?.title ?? shownRec?.content_items?.title}
        onClose={() => {
          setRecOpen(false);
        }}
      >
        {shownRec ? (
          <>
            <Text>{`Por qué: ${shownRec.reason}`}</Text>
            <EvidenceChip
              label={
                shownRec.activities?.evidence_label ?? shownRec.content_items?.evidence_label ?? ''
              }
            />
            {shownRec.activities ? (
              <Button
                label="Ver la actividad"
                icon={Puzzle}
                fullWidth
                onPress={() => {
                  const { slug, title } = shownRec.activities ?? { slug: '', title: '' };
                  setRecOpen(false);
                  flow.open(slug, title);
                }}
              />
            ) : shownHref ? (
              <Button
                label="Leer la ficha"
                icon={BookOpen}
                fullWidth
                onPress={() => {
                  setRecOpen(false);
                  router.push(shownHref as Href);
                }}
              />
            ) : null}
            <View style={{ gap: 8 }}>
              <Text variant="label">¿Cómo les fue?</Text>
              {shownStatus && shownStatus !== 'new' ? (
                <Badge tone="primary">{RECOMMENDATION_STATUS_LABELS[shownStatus]}</Badge>
              ) : null}
              {STATUS_ACTIONS.filter((a) => a.status !== shownStatus).map((action) => (
                <Button
                  key={action.status}
                  label={action.label}
                  variant="secondary"
                  fullWidth
                  disabled={update.isPending}
                  onPress={() => {
                    update.mutate({ id: shownRec.id, status: action.status });
                  }}
                />
              ))}
              <ErrorBanner error={update.error} />
            </View>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
