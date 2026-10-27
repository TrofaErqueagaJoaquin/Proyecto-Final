import { INTERESTS, makeMemberSchema, parseBirthMonth, type MemberInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useController, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button, ChipGroup, FormTextField, Text } from '@/ui';

export interface MemberFormValues {
  alias: string;
  /** "AAAA-MM-01" listo para la base. */
  birthMonth: string;
  interests: string[];
}

/**
 * Formulario de integrante. Minimización: apodo, mes/año y intereses de un catálogo cerrado.
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
  const { control, handleSubmit } = useForm<MemberInput>({
    resolver: zodResolver(makeMemberSchema(now)),
    defaultValues,
  });
  const interests = useController({ control, name: 'interests' });

  const submit = handleSubmit((values) => {
    if (beforeSubmit && !beforeSubmit()) return;
    const birthMonth = parseBirthMonth(values.birthMonth, now);
    if (!birthMonth) return; // el esquema ya lo validó
    onSubmit({ alias: values.alias, birthMonth, interests: values.interests });
  });

  return (
    <View style={{ gap: 16 }}>
      <FormTextField
        control={control}
        name="alias"
        label="Apodo"
        hint="No uses el nombre completo: alcanza con un apodo."
        autoCapitalize="words"
      />
      <FormTextField
        control={control}
        name="birthMonth"
        label="Mes y año de nacimiento"
        hint="Formato MM/AAAA, por ejemplo 03/2022. Solo guardamos el mes."
        placeholder="MM/AAAA"
        inputMode="numeric"
      />
      <ChipGroup
        multiple
        label="¿Qué le gusta? (opcional)"
        options={INTERESTS}
        value={interests.field.value}
        onChange={interests.field.onChange}
        error={interests.fieldState.error?.message}
      />
      <Text variant="small" tone="muted">
        Usamos los intereses para sugerir actividades. Nunca pedimos escuela, fotos ni diagnósticos.
      </Text>
      {children}
      <Button label={submitLabel} loading={loading} onPress={() => void submit()} />
    </View>
  );
}
