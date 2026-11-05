import type { Question } from '@crecer/domain';
import { Check, Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import type { AnswerRow } from '@/features/assessments/queries';
import { feedback } from '@/features/feedback/feedback';
import { Button, makeStyles, Text, useTheme } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

export interface AnswerChange {
  questionId: string;
  optionIds: string[];
  value: number | null;
}

const useStyles = makeStyles((t) => ({
  options: { gap: t.space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: minTouchTarget + 12,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  optionActive: { borderColor: t.colors.brand, backgroundColor: t.colors.primarySoft },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.xl,
  },
  stepButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.sunSoft,
    borderWidth: 2,
    borderColor: t.colors.sun,
  },
  value: { minWidth: 120, alignItems: 'center' },
}));

/**
 * Una pregunta del chequeo a pantalla completa: opciones como tarjetas grandes. En las de una
 * sola respuesta, tocar ya responde y avanza; en las de varias y en los números, hay un "Listo".
 */
export function CheckQuestion({
  question,
  rows,
  onAnswer,
  onNext,
}: {
  question: Question;
  rows: AnswerRow[];
  onAnswer: (change: AnswerChange) => void;
  onNext: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const questionId = question.id ?? '';
  const chosen = new Set(rows.flatMap((r) => (r.option_id ? [r.option_id] : [])));
  const stored = rows.find((r) => r.value_number !== null)?.value_number ?? null;
  const min = question.number?.min ?? 0;
  const max = question.number?.max ?? 24;
  const step = question.number?.step ?? 1;
  const [value, setValue] = useState<number>(stored ?? Math.round((min + max) / 2));

  return (
    <Animated.View entering={FadeInRight.duration(260)}>
      {question.type === 'number' ? (
        <View style={{ gap: 20 }}>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menos"
              style={styles.stepButton}
              onPress={() => {
                feedback('tap');
                setValue((v) => Math.max(min, v - step));
              }}
            >
              <Minus color={colors.ink} size={28} aria-hidden />
            </Pressable>
            <View style={styles.value} accessibilityLiveRegion="polite">
              <Text variant="display">{String(value).replace('.', ',')}</Text>
              <Text tone="muted">{question.number?.unit ?? ''}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Más"
              style={styles.stepButton}
              onPress={() => {
                feedback('tap');
                setValue((v) => Math.min(max, v + step));
              }}
            >
              <Plus color={colors.ink} size={28} aria-hidden />
            </Pressable>
          </View>
          <Button
            label="Listo"
            fullWidth
            onPress={() => {
              onAnswer({ questionId, optionIds: [], value });
              onNext();
            }}
          />
        </View>
      ) : (
        <View style={styles.options} role={question.type === 'multi' ? 'group' : 'radiogroup'}>
          {question.options.map((option) => {
            const active = chosen.has(option.id ?? '');
            return (
              <Pressable
                key={option.code}
                accessibilityRole={question.type === 'multi' ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: active }}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  feedback('tap');
                  const id = option.id ?? '';
                  if (question.type === 'multi') {
                    const next = active ? [...chosen].filter((c) => c !== id) : [...chosen, id];
                    onAnswer({ questionId, optionIds: next, value: null });
                    return;
                  }
                  onAnswer({ questionId, optionIds: [id], value: null });
                  // Un respiro para ver la elección marcada antes de pasar a la siguiente.
                  setTimeout(onNext, 280);
                }}
              >
                <View style={[styles.mark, active && styles.markActive]}>
                  {active ? <Check color={colors.onBrand} size={18} aria-hidden /> : null}
                </View>
                <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          {question.type === 'multi' ? (
            <Button label="Listo" fullWidth disabled={chosen.size === 0} onPress={onNext} />
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}
