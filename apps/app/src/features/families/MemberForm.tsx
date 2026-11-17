import {
  formatBirthMonth,
  INTERESTS,
  makeMemberSchema,
  parseBirthMonth,
  type MemberInput,
} from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { feedback } from '@/features/feedback/feedback';
import { Button, ChipGroup, FormTextField, monthYearMask } from '@/ui';

import { AGE_OPTIONS, birthMonthFromAge } from './age';

export interface MemberFormValues {
  alias: string;
  /** "AAAA-MM-01" listo para la base. */
  birthMonth: string;
  interests: string[];
}

/**
 * Formulario de integrante. Minimización: apodo, edad (o mes y año) e intereses de un catálogo
 * cerrado. Para el alta se elige la edad con los mismos chips que la bienvenida; quien quiera
 * precisión pasa a "mes y año". Al editar arranca en mes y año para no mover la fecha guardada.
 * `beforeSubmit` permite agregar requisitos (por ejemplo, el consentimiento en el alta).
 */
export function MemberForm({
  defaultValues,
  submitLabel,
  loading,
  onSubmit,
  beforeSubmit,
  children,
}: {
  defaultValues: MemberInput;
  submitLabel: string;
  loading: boolean;
  onSubmit: (values: MemberFormValues) => void;
  beforeSubmit?: () => boolean;
  children?: React.ReactNode;
}) {
  const now = new Date();
  const { control, handleSubmit, setValue } = useForm<MemberInput>({
    resolver: zodResolver(makeMemberSchema(now)),
    // Valida cada campo al salir de él y después mientras se corrige.
    mode: 'onTouched',
    defaultValues,
  });
  const interests = useController({ control, name: 'interests' });
  const birthMonth = useController({ control, name: 'birthMonth' });
  const [exact, setExact] = useState(defaultValues.birthMonth !== '');
  const [age, setAge] = useState<string | null>(null);
  // Lo cargado en "mes y año" se guarda al pasar a elegir la edad, para devolverlo al volver.
  const [savedMonth, setSavedMonth] = useState('');

  const submit = handleSubmit((values) => {
    if (beforeSubmit && !beforeSubmit()) return;
    const parsed = parseBirthMonth(values.birthMonth, now);
    if (!parsed) return; // el esquema ya lo validó
    onSubmit({ alias: values.alias, birthMonth: parsed, interests: values.interests });
  });

  return (
    <View style={{ gap: 16 }}>
      <FormTextField
        control={control}
        name="alias"
        label="¿Cómo le decís?"
        hint="Un apodo alcanza."
        autoCapitalize="words"
        maxLength={40}
      />
      {exact ? (
        <FormTextField
          control={control}
          name="birthMonth"
          label="Mes y año de nacimiento"
          hint="Por ejemplo 03/2022. La barra se pone sola."
          placeholder="MM/AAAA"
          inputMode="numeric"
          mask={monthYearMask}
          maxLength={7}
        />
      ) : (
        <ChipGroup
          label="¿Cuántos años tiene?"
          options={AGE_OPTIONS}
          value={age ?? ''}
          onChange={(value) => {
            feedback('tap');
            setAge(value);
            setValue('birthMonth', formatBirthMonth(birthMonthFromAge(Number(value), now)), {
              shouldValidate: true,
              shouldTouch: true,
            });
          }}
          error={birthMonth.fieldState.error ? 'Elegí su edad.' : undefined}
        />
      )}
      <Button
        label={exact ? 'Prefiero elegir la edad' : 'Prefiero poner mes y año'}
        variant="ghost"
        onPress={() => {
          if (exact) setSavedMonth(birthMonth.field.value);
          setExact((value) => !value);
          setAge(null);
          setValue('birthMonth', exact ? '' : savedMonth, { shouldValidate: false });
        }}
      />
      <ChipGroup
        multiple
        label="¿Qué le gusta? (opcional)"
        options={INTERESTS}
        value={interests.field.value}
        onChange={interests.field.onChange}
        error={interests.fieldState.error?.message}
      />
      {children}
      <Button label={submitLabel} loading={loading} onPress={() => void submit()} />
    </View>
  );
}
