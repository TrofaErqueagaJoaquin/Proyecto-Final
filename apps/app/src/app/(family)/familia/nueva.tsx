import { CreateFamilySchema, RELATIONSHIPS, type CreateFamilyInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useController, useForm } from 'react-hook-form';

import { useCreateFamily } from '@/features/families/queries';
import { Button, Card, ChipGroup, ErrorBanner, FormTextField, Screen, Text } from '@/ui';

export default function NewFamilyScreen() {
  const router = useRouter();
  const createFamily = useCreateFamily();
  const { control, handleSubmit } = useForm<CreateFamilyInput>({
    resolver: zodResolver(CreateFamilySchema),
    // Valida cada campo al salir de él y después mientras se corrige.
    mode: 'onTouched',
    defaultValues: { name: '', relationship: '' },
  });
  const relationship = useController({ control, name: 'relationship' });

  const onSubmit = handleSubmit((values) => {
    createFamily.mutate(values, {
      onSuccess: () => {
        router.replace('/familia');
      },
    });
  });

  return (
    <Screen>
      <Text variant="title">Crear el espacio de tu familia</Text>
      <Text tone="muted">Después sumás a los chicos y a otros adultos.</Text>
      <Card>
        <FormTextField
          control={control}
          name="name"
          label="Nombre de la familia"
          hint="Por ejemplo: Familia García."
        />
        <ChipGroup
          label="¿Cuál es tu vínculo?"
          options={RELATIONSHIPS}
          value={relationship.field.value || null}
          onChange={relationship.field.onChange}
          error={relationship.fieldState.error?.message}
        />
        <ErrorBanner error={createFamily.error} />
        <Button
          label="Crear familia"
          loading={createFamily.isPending}
          onPress={() => void onSubmit()}
        />
      </Card>
    </Screen>
  );
}
