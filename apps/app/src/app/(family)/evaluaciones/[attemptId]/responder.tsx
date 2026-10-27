import { answersFromRows, visibleQuestions, type Question } from '@crecer/domain';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { QuestionField } from '@/features/assessments/QuestionField';
import {
  useAnswers,
  useAttempt,
  useQuestionnaireVersion,
  useSaveAnswer,
  useSubmitAssessment,
} from '@/features/assessments/queries';
import { TextLink } from '@/features/auth/components';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  GrowthLine,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

/** Responder: una sección por pantalla, autoguardado y preguntas según edad y respuestas. */
export default function AnswerScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const attempt = useAttempt(attemptId);
  const version = useQuestionnaireVersion(attempt.data?.version_id);
  const answers = useAnswers(attemptId);
  const save = useSaveAnswer(attemptId);
  const submit = useSubmitAssessment(attemptId);
  const [page, setPage] = useState(0);

  if (attempt.isPending || answers.isPending || (attempt.data && version.isPending)) {
    return (
      <Screen>
        <Skeleton height={24} />
        <Skeleton height={320} />
      </Screen>
    );
  }
  if (attempt.isError || answers.isError || version.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void attempt.refetch();
          void answers.refetch();
          void version.refetch();
        }}
      />
    );
  }
  if (!attempt.data || !version.data) {
    return (
      <Screen>
        <EmptyState icon={ClipboardList} title="No encontramos esta evaluación" />
      </Screen>
    );
  }
  if (attempt.data.status === 'submitted') {
    return <Redirect href={`/evaluaciones/${attemptId}/resultado`} />;
  }
  if (attempt.data.status === 'discarded') return <Redirect href="/evaluaciones" />;

  const { definition } = version.data;
  const age = attempt.data.member_age_months;
  const inputs = answersFromRows(
    definition,
    answers.data.map((r) => ({
      questionId: r.question_id,
      optionId: r.option_id,
      valueNumber: r.value_number,
    })),
  );
  const visible = visibleQuestions(definition, age, inputs);
  const answered = new Set(inputs.map((a) => a.question));
  const isAnswered = (q: Question) => answered.has(q.code);

  // Páginas: las secciones con al menos una pregunta visible para esta edad.
  const sections = definition.sections
    .map((section) => ({
      section,
      questions: visible.filter((l) => l.section.code === section.code).map((l) => l.question),
    }))
    .filter((s) => s.questions.length > 0);
  const current = sections[Math.min(page, sections.length - 1)];
  const isLast = page >= sections.length - 1;
  const missing = visible.filter((l) => l.question.required && !isAnswered(l.question));
  const progress =
    visible.length === 0
      ? 0
      : visible.filter((l) => isAnswered(l.question)).length / visible.length;
  const alias = attempt.data.family_members?.alias ?? '';

  return (
    <Screen>
      <Text variant="small" tone="muted">
        {`Sobre ${alias} · Parte ${String(page + 1)} de ${String(sections.length)}`}
      </Text>
      <GrowthLine progress={progress} label="Avance del cuestionario" />

      {current ? (
        <Card>
          <Text variant="heading">{current.section.title}</Text>
          {current.section.description ? (
            <Text tone="muted">{current.section.description}</Text>
          ) : null}
          {current.questions.map((question) => (
            <QuestionField
              key={question.code}
              question={question}
              rows={answers.data.filter((r) => r.question_id === question.id)}
              onChange={(change) => {
                save.mutate(change);
              }}
            />
          ))}
        </Card>
      ) : null}

      <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
        {save.isPending ? 'Guardando…' : save.isError ? '' : 'Las respuestas se guardan solas.'}
      </Text>
      {save.error ? <Banner tone="danger">{friendlyError(save.error)}</Banner> : null}
      {submit.error ? <Banner tone="danger">{friendlyError(submit.error)}</Banner> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {page > 0 ? (
          <Button
            label="Anterior"
            variant="secondary"
            onPress={() => {
              setPage((p) => p - 1);
            }}
          />
        ) : null}
        {!isLast ? (
          <Button
            label="Siguiente"
            onPress={() => {
              setPage((p) => p + 1);
            }}
          />
        ) : (
          <Button
            label="Ver el resultado"
            disabled={missing.length > 0 || save.isPending}
            loading={submit.isPending}
            onPress={() => {
              submit.mutate(undefined, {
                onSuccess: () => {
                  router.replace(`/evaluaciones/${attemptId}/resultado`);
                },
              });
            }}
          />
        )}
      </View>
      {isLast && missing.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text variant="small" tone="muted">
            {missing.length === 1
              ? 'Falta responder 1 pregunta.'
              : `Faltan responder ${String(missing.length)} preguntas.`}
          </Text>
          <Button
            label="Ir a la primera que falta"
            variant="ghost"
            onPress={() => {
              const first = missing[0];
              setPage(
                Math.max(
                  0,
                  sections.findIndex((s) => s.section.code === first?.section.code),
                ),
              );
            }}
          />
        </View>
      ) : null}

      <Text variant="small" tone="muted">
        Podés salir y seguir después:{' '}
        <TextLink href="/evaluaciones">volver a Evaluaciones</TextLink>.
      </Text>
    </Screen>
  );
}
