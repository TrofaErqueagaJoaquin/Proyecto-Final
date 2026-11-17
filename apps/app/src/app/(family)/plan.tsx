import { mondayOf } from '@crecer/domain';
import { Link, Redirect, router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Brote } from '@/features/brote/Brote';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { PlanItemCard } from '@/features/plans/PlanItemCard';
import { localDate, useGeneratePlan, useWeekPlans } from '@/features/plans/queries';
import {
  Button,
  Card,
  ChipGroup,
  ConfirmAction,
  ErrorBanner,
  ErrorState,
  GrowthLine,
  LoadingScreen,
  Screen,
  Skeleton,
  Text,
  useOverlayTurn,
} from '@/ui';

const FAMILY = 'familia';
const RANGE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

function weekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `Del ${RANGE.format(start)} al ${RANGE.format(end)}`;
}

/** Plan de la semana: 5 a 7 ideas posibles, con "Realizado" y lo que sigue a la vista (F7). */
export default function PlanScreen() {
  const { isPending, family } = useActiveFamily();
  const members = useMembers(family?.id);
  const weekStart = mondayOf(localDate());
  const plans = useWeekPlans(family?.id, weekStart);
  const generate = useGeneratePlan();
  const [chosen, setScope] = useState<string | null>(null);
  // Festejo de la semana completa: solo cuando se completa ahora, no al abrir un plan ya hecho.
  const [lastPending, setLastPending] = useState<{ id: string; pending: number } | null>(null);
  const [weekDone, setWeekDone] = useState(false);
  const weekDoneVisible = useOverlayTurn('plan-completo', weekDone);

  // Sin elección, se abre el plan que ya existe esta semana (primero el de la familia): si no,
  // "Toda la familia" mostraba "Todavía no hay plan" aunque Tomi tuviera el suyo.
  const existing = plans.data?.find((p) => p.member_id === null) ?? plans.data?.[0];
  const scope = chosen ?? existing?.member_id ?? FAMILY;
  const memberId = scope === FAMILY ? null : scope;
  const plan = plans.data?.find((p) => p.member_id === memberId);
  const doneCount = plan?.items.filter((i) => i.status === 'done').length ?? 0;
  const pendingCount = plan?.items.filter((i) => i.status === 'planned').length ?? 0;

  if (plan && (lastPending?.id !== plan.id || lastPending.pending !== pendingCount)) {
    if (lastPending?.id === plan.id && pendingCount === 0 && doneCount > 0) setWeekDone(true);
    setLastPending({ id: plan.id, pending: pendingCount });
  }

  if (isPending) return <LoadingScreen />;
  if (!family) return <Redirect href="/bienvenida" />;

  const manage = canManage(family.role);
  const options = [
    { value: FAMILY, label: 'Toda la familia' },
    ...(members.data ?? [])
      .filter((m) => m.archived_at === null)
      .map((m) => ({ value: m.id, label: m.alias })),
  ];
  // Lo que sigue: la primera pendiente de hoy en adelante (o la primera que quedó atrás).
  const today = localDate();
  const planned = plan?.items.filter((i) => i.status === 'planned') ?? [];
  const nextId = (planned.find((i) => i.scheduled_for >= today) ?? planned[0])?.id;
  const build = () => {
    generate.mutate({ familyId: family.id, memberId, weekStart });
  };

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
        <Card>
          <ErrorState
            error={plans.error}
            title="No pudimos traer tu plan"
            onRetry={() => void plans.refetch()}
          />
        </Card>
      ) : !plan ? (
        <Card>
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Brote mood="hola" size={112} />
            <Text variant="subheading" center>
              Todavía no hay plan para esta semana
            </Text>
            {manage ? (
              <Button
                label="Armar el plan"
                icon={Sparkles}
                loading={generate.isPending}
                onPress={build}
              />
            ) : (
              <Text tone="muted" center>
                Lo arma la persona responsable de la familia.
              </Text>
            )}
          </View>
          <ErrorBanner error={generate.error} />
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
              <PlanItemCard key={item.id} item={item} plan={plan} next={item.id === nextId} />
            ))}
          </View>
          {manage ? (
            <ConfirmAction
              key={plan.id}
              label="Volver a armar el plan"
              confirmLabel="Sí, armarlo de nuevo"
              description="Cambian todas las ideas. Lo que ya hicieron queda guardado."
              loading={generate.isPending}
              onConfirm={build}
            />
          ) : null}
          <ErrorBanner error={generate.error} />
        </>
      )}

      <GuidePopup
        visible={weekDoneVisible}
        celebrate
        title="¡Semana completa!"
        message="Hicieron todo el plan. ¡Qué buena semana!"
        primary={{
          label: 'Ir a Hoy',
          onPress: () => {
            setWeekDone(false);
            router.push('/hoy');
          },
        }}
        secondary={{
          label: 'Cerrar',
          onPress: () => {
            setWeekDone(false);
          },
        }}
        onClose={() => {
          setWeekDone(false);
        }}
      />
    </Screen>
  );
}
