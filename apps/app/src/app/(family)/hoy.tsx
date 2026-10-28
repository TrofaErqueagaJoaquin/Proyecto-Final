import { Link } from 'expo-router';
import { Users } from 'lucide-react-native';

import { useMe } from '@/features/auth/queries';
import { TodaySection } from '@/features/plans/TodaySection';
import { Button, Card, EmptyState, ErrorState, GrowthLine, Screen, Skeleton, Text } from '@/ui';

/** Inicio del espacio familiar: UNA sugerencia concreta para hoy (UX_AND_NAVIGATION.md §2.3). */
export default function TodayScreen() {
  const me = useMe();

  if (me.isPending) {
    return (
      <Screen>
        <Skeleton height={36} width="50%" />
        <Skeleton height={140} />
      </Screen>
    );
  }
  if (me.isError) return <ErrorState onRetry={() => void me.refetch()} />;

  const firstName = me.data.profile.displayName.split(' ')[0];

  return (
    <Screen>
      <Text variant="title">Hola, {firstName}</Text>
      <GrowthLine />
      {me.data.families.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Creá el espacio de tu familia"
            description="Agregá a quienes acompañás y a los adultos que comparten la crianza. Te lleva menos de dos minutos."
            action={
              <Link href="/familia/nueva" asChild>
                <Button label="Crear mi familia" />
              </Link>
            }
          />
        </Card>
      ) : (
        <TodaySection
          familyId={me.data.families[0]?.id ?? ''}
          role={me.data.families[0]?.role ?? 'caregiver'}
        />
      )}
    </Screen>
  );
}
