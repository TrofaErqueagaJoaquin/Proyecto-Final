import { CreateFamilySchema, RELATIONSHIPS, type CreateFamilyInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useController, useForm } from 'react-hook-form';

import { friendlyError } from '@/copy/errors';
import { useCreateFamily } from '@/features/families/queries';
import { Banner, Button, Card, ChipGroup, FormTextField, Screen, Text } from '@/ui';

export default function NewFamilyScreen() {
  const router = useRouter();
  const createFamily = useCreateFamily();
  const { control, handleSubmit } = useForm<CreateFamilyInput>({
    resolver: zodResolver(CreateFamilySchema),
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
      <Text tone="muted">
        Después vas a poder agregar a quienes acompañás e invitar a otros adultos que comparten la
        crianza.
      </Text>
      <Card>
        <FormTextField
          control={control}
          name="name"
          label="Nombre de la familia"
          hint="Por ejemplo: Familia García. Solo lo ven los adultos que invites."
        />
        <ChipGroup
          label="¿Cuál es tu vínculo?"
          options={RELATIONSHIPS}
          value={relationship.field.value || null}
          onChange={relationship.field.onChange}
          error={relationship.fieldState.error?.message}
        />
        {createFamily.error ? (
          <Banner tone="danger">{friendlyError(createFamily.error)}</Banner>
        ) : null}
        <Button
          label="Crear familia"
          loading={createFamily.isPending}
          onPress={() => void onSubmit()}
        />
      </Card>
    </Screen>
  );
}
