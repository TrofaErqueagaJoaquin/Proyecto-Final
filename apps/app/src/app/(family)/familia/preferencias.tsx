import { INTERESTS, type PreferencesInput } from '@crecer/shared';
import { Redirect } from 'expo-router';
import { useState } from 'react';

import { friendlyError } from '@/copy/errors';
import {
  canManage,
  useActiveFamily,
  usePreferences,
  useUpdatePreferences,
} from '@/features/families/queries';
import { Banner, Button, Card, ChipGroup, ErrorState, Screen, Skeleton, Text } from '@/ui';

const MINUTES = [
  { value: '10', label: '10 minutos' },
  { value: '20', label: '20 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora o más' },
] as const;
const SPACES = [
  { value: 'small_indoor', label: 'Espacio chico' },
  { value: 'indoor', label: 'Adentro, con lugar' },
  { value: 'outdoor', label: 'Patio, plaza o parque' },
] as const;
const BUDGETS = [
  { value: 'free', label: 'Sin gastar' },
  { value: 'low', label: 'Poco' },
  { value: 'medium', label: 'Algo más' },
] as const;

function PreferencesForm({ familyId, initial }: { familyId: string; initial: PreferencesInput }) {
  const [values, setValues] = useState(initial);
  const update = useUpdatePreferences(familyId);
  return (
    <Card>
      <ChipGroup
        label="¿Cuánto tiempo suelen tener en un día de semana?"
        options={MINUTES}
        value={values.minutesPerDay === null ? null : (String(values.minutesPerDay) as '10')}
        onChange={(value) => {
          setValues({ ...values, minutesPerDay: Number(value) });
        }}
      />
      <ChipGroup
        label="¿Dónde suelen jugar?"
        options={SPACES}
        value={values.space}
        onChange={(value) => {
          setValues({ ...values, space: value });
        }}
      />
      <ChipGroup
        label="Presupuesto para actividades"
        options={BUDGETS}
        value={values.budget}
        onChange={(value) => {
          setValues({ ...values, budget: value });
        }}
      />
      <ChipGroup
        multiple
        label="Intereses de la familia"
        options={INTERESTS}
        value={values.interests}
        onChange={(interests) => {
          setValues({ ...values, interests });
        }}
      />
      {update.isSuccess ? <Banner tone="success">Guardamos las preferencias.</Banner> : null}
      {update.error ? <Banner tone="danger">{friendlyError(update.error)}</Banner> : null}
      <Button
        label="Guardar preferencias"
        loading={update.isPending}
        onPress={() => {
          update.mutate(values);
        }}
      />
    </Card>
  );
}

export default function PreferencesScreen() {
  const { isPending, family } = useActiveFamily();
  const preferences = usePreferences(family?.id);

  if (isPending || preferences.isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;
  if (!canManage(family.role)) return <Redirect href="/familia" />;
  if (preferences.isError) return <ErrorState onRetry={() => void preferences.refetch()} />;

  const p = preferences.data;
  return (
    <Screen>
      <Text variant="title">Preferencias</Text>
      <Text tone="muted">
        Las usamos para sugerir actividades posibles con su tiempo, su espacio y su presupuesto.
      </Text>
      <PreferencesForm
        familyId={family.id}
        initial={{
          minutesPerDay: p.minutes_per_day,
          space: p.space as PreferencesInput['space'],
          budget: p.budget as PreferencesInput['budget'],
          interests: p.interests as PreferencesInput['interests'],
        }}
      />
    </Screen>
  );
}
