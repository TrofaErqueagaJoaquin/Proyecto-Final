import { INTERESTS, type PreferencesInput } from '@crecer/shared';
import { Link, Redirect } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import {
  canManage,
  useActiveFamily,
  usePreferences,
  useUpdatePreferences,
} from '@/features/families/queries';
import { Button, Card, ChipGroup, ErrorBanner, ErrorState, Screen, Skeleton, Text } from '@/ui';

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
  const [savedKey, setSavedKey] = useState(0);
  return (
    <View style={{ gap: 16 }}>
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
        <ErrorBanner error={update.error} />
        <Button
          label="Guardar preferencias"
          savedKey={savedKey}
          savedLabel="Guardamos las preferencias"
          loading={update.isPending}
          onPress={() => {
            update.mutate(values, {
              onSuccess: () => {
                setSavedKey((n) => n + 1);
              },
            });
          }}
        />
      </Card>
      {update.isSuccess ? (
        <Link href="/plan" asChild>
          <Button label="Rearmar la semana con esto" icon={CalendarDays} fullWidth />
        </Link>
      ) : null}
    </View>
  );
}

export default function PreferencesScreen() {
  const { isPending, family } = useActiveFamily();
  const preferences = usePreferences(family?.id);

  if (isPending || preferences.isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/bienvenida" />;
  if (!canManage(family.role)) return <Redirect href="/familia" />;
  if (preferences.isError) return <ErrorState onRetry={() => void preferences.refetch()} />;

  const p = preferences.data;
  return (
    <Screen>
      <Text variant="title">Preferencias</Text>
      <Text tone="muted">Las usamos para sugerir actividades que les queden cómodas.</Text>
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
