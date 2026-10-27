import type { Question } from '@crecer/domain';
import { useState } from 'react';
import { View } from 'react-native';

import { ChipGroup, Text, TextField } from '@/ui';

import type { AnswerRow } from './queries';

export interface AnswerChange {
  questionId: string;
  optionIds: string[];
  value: number | null;
}

function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Una pregunta del cuestionario: opción única, selección múltiple o número. */
export function QuestionField({
  question,
  rows,
  onChange,
}: {
  question: Question;
  rows: AnswerRow[];
  onChange: (change: AnswerChange) => void;
}) {
  const questionId = question.id ?? '';
  const chosen = question.options.filter((o) => rows.some((r) => r.option_id === o.id));
  const stored = rows.find((r) => r.value_number !== null)?.value_number ?? null;
  const [text, setText] = useState(stored === null ? '' : String(stored).replace('.', ','));
  const [error, setError] = useState<string | undefined>();
  const idByCode = new Map(question.options.map((o) => [o.code, o.id ?? '']));
  const options = question.options.map((o) => ({ value: o.code, label: o.label }));

  const label = question.required ? question.prompt : `${question.prompt} (opcional)`;

  return (
    <View style={{ gap: 6 }}>
      {question.type === 'number' && question.number ? (
        <TextField
          label={label}
          hint={question.help}
          error={error}
          value={text}
          inputMode="decimal"
          keyboardType="decimal-pad"
          onChangeText={setText}
          onBlur={() => {
            const { min, max, unit } = question.number ?? { min: 0, max: 0, unit: '' };
            const value = parseNumber(text);
            if (value !== null && (Number.isNaN(value) || value < min || value > max)) {
              setError(`Escribí un número entre ${String(min)} y ${String(max)} ${unit}.`);
              return;
            }
            setError(undefined);
            if (value !== stored) onChange({ questionId, optionIds: [], value });
          }}
        />
      ) : (
        <>
          {question.type === 'multi' ? (
            <ChipGroup
              multiple
              label={label}
              options={options}
              value={chosen.map((o) => o.code)}
              onChange={(codes) => {
                onChange({
                  questionId,
                  optionIds: codes.map((code) => idByCode.get(code) ?? ''),
                  value: null,
                });
              }}
            />
          ) : (
            <ChipGroup
              label={label}
              options={options}
              value={chosen[0]?.code ?? null}
              onChange={(code) => {
                onChange({ questionId, optionIds: [idByCode.get(code) ?? ''], value: null });
              }}
            />
          )}
          {question.help ? (
            <Text variant="small" tone="muted">
              {question.help}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
