import { answersFromRows, visibleQuestions } from '@crecer/domain';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  useAnswers,
  useAttempt,
  useQuestionnaireVersion,
  useSaveAnswer,
  useSubmitAssessment,
} from '@/features/assessments/queries';
import { BroteEmptyState, BroteSays } from '@/features/brote/Brote';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { CheckQuestion } from '@/features/chequeo/CheckQuestion';
import { feedback } from '@/features/feedback/feedback';
import {
  Button,
  ErrorBanner,
  ErrorScreen,
  GrowthLine,
  LoadingScreen,
  Screen,
  Text,
  useOverlayTurn,
} from '@/ui';

/**
 * Chequeo completo: igual que el de 1 minuto (una pregunta por pantalla con Brote), con
 * autoguardado y preguntas según la edad y las respuestas. Retoma donde quedó.
 */
export default function AnswerScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const attempt = useAttempt(attemptId);
  const version = useQuestionnaireVersion(attempt.data?.version_id);
  const answers = useAnswers(attemptId);
  const save = useSaveAnswer(attemptId);
  const submit = useSubmitAssessment(attemptId);
  // `null` hasta saber dónde retomar (la primera sin responder).
  const [step, setStep] = useState<number | null>(null);
  const [markMissing, setMarkMissing] = useState<string | null>(null);
  // Enviado: se festeja antes de ir al resultado (sin esto, el redireccionamiento lo saltea).
  const [sent, setSent] = useState(false);
  const popupVisible = useOverlayTurn('resultado', sent && submit.isSuccess);
  const goToResult = () => {
    router.replace(`/evaluaciones/${attemptId}/resultado`);
  };
  useEffect(() => {
    if (submit.isSuccess) feedback('achievement');
  }, [submit.isSuccess]);

  if (attempt.isPending || answers.isPending || (attempt.data && version.isPending)) {
    return <LoadingScreen />;
  }
  if (attempt.isError || answers.isError || version.isError) {
    return (
      <ErrorScreen
        error={attempt.error ?? answers.error ?? version.error}
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
        <BroteEmptyState title="No encontramos este chequeo" />
      </Screen>
    );
  }
  const alias = attempt.data.family_members?.alias ?? 'tu peque';
  if (attempt.data.status === 'submitted') {
    if (sent) {
      return (
        <Screen>
          <GuidePopup
            visible={popupVisible}
            celebrate
            title="¡Listo!"
            message={`Ya está el resultado de ${alias}.`}
            primary={{ label: 'Ver el resultado', onPress: goToResult }}
            onClose={goToResult}
          />
          <BroteSays mood="feliz">{`¡Gracias! Ya conozco más a ${alias}.`}</BroteSays>
          <Button label="Ver el resultado" fullWidth onPress={goToResult} />
        </Screen>
      );
    }
    return <Redirect href={`/evaluaciones/${attemptId}/resultado`} />;
  }
  if (attempt.data.status === 'discarded') return <Redirect href="/evaluaciones" />;

  const { definition } = version.data;
  const inputs = answersFromRows(
    definition,
    answers.data.map((r) => ({
      questionId: r.question_id,
      optionId: r.option_id,
      valueNumber: r.value_number,
    })),
  );
  const visible = visibleQuestions(definition, attempt.data.member_age_months, inputs);
  const answered = new Set(inputs.map((a) => a.question));
  const firstUnanswered = visible.findIndex((l) => !answered.has(l.question.code));
  const firstMissing = visible.findIndex(
    (l) => l.question.required && !answered.has(l.question.code),
  );
  const at = Math.min(
    step ?? (firstUnanswered === -1 ? visible.length : firstUnanswered),
    visible.length,
  );
  const current = visible[at];
  const isDone = at >= visible.length;

  const saveError = (
    <ErrorBanner
      error={save.error}
      retryLoading={save.isPending}
      onRetry={() => {
        if (save.variables) save.mutate(save.variables);
      }}
    />
  );

  return (
    <Screen scrollKey={isDone ? 'fin' : at}>
      <GrowthLine
        progress={visible.length === 0 ? 1 : at / visible.length}
        label="Avance del chequeo"
      />
      {current && !isDone ? (
        <View style={{ gap: 20 }}>
          <Text variant="small" tone="muted">
            {`${current.section.title} · ${String(at + 1)} de ${String(visible.length)}`}
          </Text>
          <BroteSays mood="pensando">{current.question.prompt.replace('{alias}', alias)}</BroteSays>
          {current.question.help ? (
            <Text variant="small" tone="muted">
              {current.question.help}
            </Text>
          ) : null}
          <CheckQuestion
            key={current.question.code}
            question={current.question}
            rows={answers.data.filter((r) => r.question_id === current.question.id)}
            missing={markMissing === current.question.code}
            onAnswer={(change) => {
              save.mutate(change);
            }}
            onNext={() => {
              setStep(at + 1);
            }}
            onBack={
              at > 0
                ? () => {
                    setStep(at - 1);
                  }
                : undefined
            }
          />
          {saveError}
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <BroteSays mood="feliz">¡Eso es todo! ¿Vemos qué encontramos?</BroteSays>
          {saveError}
          <ErrorBanner error={submit.error} />
          <Button
            label="Ver el resultado"
            fullWidth
            loading={submit.isPending}
            disabled={save.isPending}
            onPress={() => {
              // Si quedó alguna obligatoria sin responder, se lleva a la primera y se marca.
              const missing = visible[firstMissing];
              if (missing) {
                setMarkMissing(missing.question.code);
                setStep(firstMissing);
                return;
              }
              setSent(true);
              submit.mutate(undefined, {
                onError: () => {
                  setSent(false);
                },
              });
            }}
          />
          {visible.length > 0 ? (
            <Button
              label="Revisar mis respuestas"
              variant="ghost"
              onPress={() => {
                setStep(0);
              }}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
