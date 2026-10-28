import { mondayOf } from '@crecer/domain';
import { Link, Redirect } from 'expo-router';
import { CalendarDays, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { PlanItemCard } from '@/features/plans/PlanItemCard';
import { localDate, useGeneratePlan, useWeekPlans } from '@/features/plans/queries';
import {
  Banner,
  Button,
  Card,
  ChipGroup,
  EmptyState,
  ErrorState,
  GrowthLine,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

const FAMILY = 'familia';
const RANGE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

function weekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `Del ${RANGE.format(start)} al ${RANGE.format(end)}`;
}

/** Plan de la semana: 5 a 7 ideas posibles, con "Hecho" y "Otra idea" (F7). */
export default function PlanScreen() {
  const { isPending, family } = useActiveFamily();
  const members = useMembers(family?.id);
  const weekStart = mondayOf(localDate());
  const plans = useWeekPlans(family?.id, weekStart);
  const generate = useGeneratePlan();
  const [scope, setScope] = useState<string>(FAMILY);

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;

  const manage = canManage(family.role);
  const memberId = scope === FAMILY ? null : scope;
  const plan = plans.data?.find((p) => p.member_id === memberId);
  const options = [
    { value: FAMILY, label: 'Toda la familia' },
    ...(members.data ?? [])
      .filter((m) => m.archived_at === null)
      .map((m) => ({ value: m.id, label: m.alias })),
  ];
  const doneCount = plan?.items.filter((i) => i.status === 'done').length ?? 0;

  return (
    <Screen>
      <Text variant="title">Plan de la semana</Text>
      <Text tone="muted">{weekRange(weekStart)}</Text>
      {options.length > 1 ? (
        <ChipGroup label="¿Para quién?" options={options} value={scope} onChange={setScope} />
      ) : null}

      {plans.isPending ? (
        <Skeleton height={240} />
      ) : plans.isError ? (
        <ErrorState onRetry={() => void plans.refetch()} />
      ) : !plan ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Todavía no hay plan para esta semana"
            description="Armamos de 5 a 7 ideas con su tiempo, su espacio y su presupuesto, empezando por lo que recomendó la evaluación. Siempre hay una de 10 minutos sin materiales."
            action={
              manage ? (
                <Button
                  label="Armar el plan"
                  icon={Sparkles}
                  loading={generate.isPending}
                  onPress={() => {
                    generate.mutate({ familyId: family.id, memberId, weekStart });
                  }}
                />
              ) : (
                <Text tone="muted">Lo arma la persona responsable de la familia.</Text>
              )
            }
          />
          {manage ? (
            <Link href="/familia/preferencias" asChild>
              <Button label="Revisar las preferencias" variant="ghost" />
            </Link>
          ) : null}
        </Card>
      ) : (
        <>
          <GrowthLine
            progress={plan.items.length === 0 ? 0 : doneCount / plan.items.length}
            label={`${String(doneCount)} de ${String(plan.items.length)} actividades hechas`}
          />
          <Text variant="small" tone="muted">
            {`${String(doneCount)} de ${String(plan.items.length)} hechas`}
          </Text>
          <View style={{ gap: 12 }}>
            {plan.items.map((item) => (
              <PlanItemCard key={item.id} item={item} plan={plan} />
            ))}
          </View>
          {manage ? (
            <Button
              label="Volver a armar el plan"
              variant="secondary"
              loading={generate.isPending}
              onPress={() => {
                generate.mutate({ familyId: family.id, memberId, weekStart });
              }}
            />
          ) : null}
        </>
      )}
      {generate.error ? <Banner tone="danger">{friendlyError(generate.error)}</Banner> : null}
    </Screen>
  );
}
