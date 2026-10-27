import { Link } from 'expo-router';
import { Sprout, Users } from 'lucide-react-native';

import { useMe } from '@/features/auth/queries';
import { canManage } from '@/features/families/queries';
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
        <Card>
          <EmptyState
            icon={Sprout}
            title="Tu sugerencia del día llega pronto"
            description="Cuando completes la primera evaluación de hábitos (lleva unos 6 minutos), acá vas a ver una idea concreta para hoy."
            action={
              canManage(me.data.families[0]?.role) ? (
                <Link href="/evaluaciones" asChild>
                  <Button label="Hacer la evaluación" />
                </Link>
              ) : undefined
            }
          />
        </Card>
      )}
    </Screen>
  );
}
