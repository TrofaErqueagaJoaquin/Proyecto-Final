import { answersFromRows, visibleQuestions } from '@crecer/domain';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  useAnswers,
  useAttempt,
  useQuestionnaireVersion,
  useSaveAnswer,
  useStartAssessment,
  useSubmitAssessment,
} from '@/features/assessments/queries';
import { BroteSays } from '@/features/brote/Brote';
import { CheckQuestion } from '@/features/chequeo/CheckQuestion';
import { CheckResult } from '@/features/chequeo/CheckResult';
import { QUICK_CHECK, useQuestionnaireBySlug, useQuickAnswers } from '@/features/chequeo/queries';
import { Banner, Button, ErrorState, GrowthLine, Screen, Skeleton, Text } from '@/ui';

/**
 * Chequeo corto (rediseño de 2026): una pregunta por pantalla con Brote, y al final un festejo con
 * el resultado y una actividad para hoy. `?tema=tema-sueno` (y los demás) hace el mini-chequeo de
 * un tema; sin `tema`, el de 1 minuto.
 */
export default function CheckScreen() {
  const { memberId, tema } = useLocalSearchParams<{ memberId: string; tema?: string }>();
  const slug = tema?.startsWith('tema-') ? tema : QUICK_CHECK;
  const questionnaire = useQuestionnaireBySlug(slug);
  const start = useStartAssessment();
  const [attemptId, setAttemptId] = useState<string | undefined>(undefined);
  const attempt = useAttempt(attemptId);
  const version = useQuestionnaireVersion(questionnaire.data?.id);
  const answers = useAnswers(attemptId);
  const save = useSaveAnswer(attemptId ?? '');
  const submit = useSubmitAssessment(attemptId ?? '');
  const [step, setStep] = useState(0);
  const started = useRef(false);
  const isTheme = slug !== QUICK_CHECK;
  const quick = useQuickAnswers(memberId, isTheme);
  const carriedFor = useRef<string | null>(null);

  // Empieza (o retoma) el intento apenas se conoce la versión.
  useEffect(() => {
    const versionId = questionnaire.data?.id;
    if (!versionId || started.current) return;
    started.current = true;
    start.mutate(
      { memberId, versionId },
      {
        onSuccess: (id) => {
          setAttemptId(id);
        },
      },
    );
  }, [memberId, questionnaire.data?.id, start]);

  // Chequeo por tema: lo que ya se contestó en el de 1 minuto se copia y no se vuelve a preguntar.
  const carriedCodes = new Set<string>();
  for (const section of version.data?.definition.sections ?? []) {
    for (const question of section.questions) {
      if (quick.data?.has(question.code)) carriedCodes.add(question.code);
    }
  }
  useEffect(() => {
    if (!attemptId || !version.data || !answers.data || !quick.data) return;
    if (carriedFor.current === attemptId) return;
    carriedFor.current = attemptId;
    const answered = new Set(answers.data.map((a) => a.question_id));
    for (const section of version.data.definition.sections) {
      for (const question of section.questions) {
        const previous = quick.data.get(question.code);
        if (!previous || !question.id || answered.has(question.id)) continue;
        const optionIds = question.options.flatMap((o) =>
          o.id && previous.optionCodes.includes(o.code) ? [o.id] : [],
        );
        if (previous.value === null && optionIds.length === 0) continue;
        save.mutate({ questionId: question.id, optionIds, value: previous.value });
      }
    }
  }, [attemptId, version.data, answers.data, quick.data, save]);

  if (questionnaire.isError || attempt.isError || version.isError || answers.isError) {
    return <ErrorState onRetry={() => void questionnaire.refetch()} />;
  }
  if (start.isError) {
    return (
      <Screen>
        <Banner tone="danger">{friendlyError(start.error)}</Banner>
        <Redirect href="/hoy" />
      </Screen>
    );
  }
  if (!attempt.data || !version.data || !answers.data || (isTheme && !quick.data)) {
    return (
      <Screen>
        <BroteSays mood="pensando">Preparando unas preguntas cortitas…</BroteSays>
        <Skeleton height={240} />
      </Screen>
    );
  }

  const { definition, spec } = version.data;
  const alias = attempt.data.family_members?.alias ?? 'tu peque';

  if (attempt.data.status === 'submitted' && attemptId) {
    return (
      <Screen>
        <CheckResult attemptId={attemptId} alias={alias} definition={definition} spec={spec} />
      </Screen>
    );
  }

  const inputs = answersFromRows(
    definition,
    answers.data.map((r) => ({
      questionId: r.question_id,
      optionId: r.option_id,
      valueNumber: r.value_number,
    })),
  );
  const visible = visibleQuestions(definition, attempt.data.member_age_months, inputs).filter(
    (v) => !carriedCodes.has(v.question.code),
  );
  const current = visible[step];
  const isDone = step >= visible.length;

  return (
    <Screen>
      <GrowthLine
        progress={visible.length === 0 ? 1 : Math.min(step, visible.length) / visible.length}
        label="Avance del chequeo"
      />
      {current && !isDone ? (
        <View style={{ gap: 20 }}>
          <Text variant="small" tone="muted">
            {`${current.section.title} · ${String(step + 1)} de ${String(visible.length)}`}
          </Text>
          <BroteSays mood="pensando">{current.question.prompt.replace('{alias}', alias)}</BroteSays>
          <CheckQuestion
            key={current.question.code}
            question={current.question}
            rows={answers.data.filter((r) => r.question_id === current.question.id)}
            onAnswer={(change) => {
              save.mutate(change);
            }}
            onNext={() => {
              setStep((s) => s + 1);
            }}
          />
          {step > 0 ? (
            <Button
              label="Volver a la anterior"
              variant="ghost"
              onPress={() => {
                setStep((s) => Math.max(0, s - 1));
              }}
            />
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <BroteSays mood="feliz">¡Eso es todo! ¿Vemos qué encontramos?</BroteSays>
          {submit.error ? <Banner tone="danger">{friendlyError(submit.error)}</Banner> : null}
          <Button
            label="Ver mi resultado"
            fullWidth
            loading={submit.isPending}
            disabled={save.isPending}
            onPress={() => {
              submit.mutate(undefined, {
                onSuccess: () => void attempt.refetch(),
              });
            }}
          />
          <Button
            label="Revisar mis respuestas"
            variant="ghost"
            onPress={() => {
              setStep(0);
            }}
          />
        </View>
      )}
    </Screen>
  );
}
