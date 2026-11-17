import type { Question } from '@crecer/domain';
import { Check, Minus, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import type { AnswerRow } from '@/features/assessments/queries';
import { feedback } from '@/features/feedback/feedback';
import { makeStyles, StepNav, Text, useTheme } from '@/ui';
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
  missing: {
    borderRadius: t.radius.md,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.md,
    backgroundColor: t.colors.cautionSoft,
  },
}));

/**
 * Una pregunta del chequeo a pantalla completa: opciones como tarjetas grandes. En las de una
 * sola respuesta, tocar ya responde y avanza. Abajo, siempre los mismos botones ("Atrás" y
 * "Siguiente"): si falta responder una obligatoria, "Siguiente" no avanza y marca "Falta esta".
 * Los números arrancan en "—": el primer toque de − o + muestra un valor del medio.
 */
export function CheckQuestion({
  question,
  rows,
  onAnswer,
  onNext,
  onBack,
  nextLabel = 'Siguiente',
  missing: missingFromParent = false,
}: {
  question: Question;
  rows: AnswerRow[];
  onAnswer: (change: AnswerChange) => void;
  onNext: () => void;
  /** Sin valor (primera pregunta), no hay "Atrás". */
  onBack?: (() => void) | undefined;
  nextLabel?: string;
  /** La pantalla la marca como pendiente (por ejemplo, al llevar a la primera que falta). */
  missing?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const questionId = question.id ?? '';
  const chosen = new Set(rows.flatMap((r) => (r.option_id ? [r.option_id] : [])));
  const stored = rows.find((r) => r.value_number !== null)?.value_number ?? null;
  const min = question.number?.min ?? 0;
  const max = question.number?.max ?? 24;
  const step = question.number?.step ?? 1;
  const typical = Math.min(max, Math.max(min, Math.round((min + max) / 2 / step) * step));
  // Sin respuesta guardada no se inventa un valor: se ve "—" hasta tocar − o +.
  const [value, setValue] = useState<number | null>(stored);
  const [missingHere, setMissingHere] = useState(false);
  const answered = question.type === 'number' ? value !== null : chosen.size > 0;
  const showMissing = (missingHere || missingFromParent) && !answered;
  // Un solo avance pendiente: tocar otra opción antes de que pase reemplaza al anterior (si no, dos
  // toques rápidos saltaban una pregunta). Al desmontar se cancela.
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (advance.current) clearTimeout(advance.current);
    },
    [],
  );

  const change = (delta: number) => {
    feedback('tap');
    setValue((v) => (v === null ? typical : Math.min(max, Math.max(min, v + delta))));
  };

  const next = () => {
    if (!answered && question.required) {
      feedback('tap');
      setMissingHere(true);
      return;
    }
    if (question.type === 'number' && value !== null && value !== stored) {
      onAnswer({ questionId, optionIds: [], value });
    }
    onNext();
  };

  return (
    <Animated.View entering={FadeInRight.duration(260)} style={{ gap: 20 }}>
      {question.type === 'number' ? (
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menos"
            style={styles.stepButton}
            onPress={() => {
              change(-step);
            }}
          >
            <Minus color={colors.ink} size={28} aria-hidden />
          </Pressable>
          <View
            style={styles.value}
            accessibilityLiveRegion="polite"
            accessibilityLabel={
              value === null
                ? 'Sin elegir todavía'
                : `${String(value).replace('.', ',')} ${question.number?.unit ?? ''}`
            }
          >
            <Text variant="display">{value === null ? '—' : String(value).replace('.', ',')}</Text>
            <Text tone="muted">{question.number?.unit ?? ''}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Más"
            style={styles.stepButton}
            onPress={() => {
              change(step);
            }}
          >
            <Plus color={colors.ink} size={28} aria-hidden />
          </Pressable>
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
                    const nextIds = active ? [...chosen].filter((c) => c !== id) : [...chosen, id];
                    onAnswer({ questionId, optionIds: nextIds, value: null });
                    return;
                  }
                  onAnswer({ questionId, optionIds: [id], value: null });
                  // Un respiro para ver la elección marcada antes de pasar a la siguiente.
                  if (advance.current) clearTimeout(advance.current);
                  advance.current = setTimeout(() => {
                    advance.current = null;
                    onNext();
                  }, 280);
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
        </View>
      )}
      {showMissing ? (
        <View style={styles.missing} role="alert">
          <Text variant="bodyStrong">
            {question.type === 'number' ? 'Falta esta: tocá − o +.' : 'Falta esta: elegí una.'}
          </Text>
        </View>
      ) : null}
      <StepNav onBack={onBack} onNext={next} nextLabel={nextLabel} />
    </Animated.View>
  );
}
