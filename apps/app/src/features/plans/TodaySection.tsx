import { mondayOf } from '@crecer/domain';
import type { FamilyRole } from '@crecer/shared';
import { Link } from 'expo-router';
import { CalendarDays, ClipboardList, Sprout, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { useFamilyAttempts } from '@/features/assessments/queries';
import { canManage } from '@/features/families/queries';
import { latestProgress, useGoals } from '@/features/goals/queries';
import { LinkCard } from '@/features/library/LinkCard';
import { Button, Card, EmptyState, Skeleton, Text, useTheme } from '@/ui';

import { PlanItemCard } from './PlanItemCard';
import { localDate, useWeekPlans } from './queries';

/**
 * Tarjeta "Hoy" (UX_AND_NAVIGATION.md §1.2): UNA sugerencia concreta para el día, del plan de
 * la semana, con "Hecho" y "Otra idea". Debajo, los objetivos en curso.
 */
export function TodaySection({ familyId, role }: { familyId: string; role: FamilyRole }) {
  const today = localDate();
  const plans = useWeekPlans(familyId, mondayOf(today));
  const goals = useGoals(familyId);
  const manage = canManage(role);
  const attempts = useFamilyAttempts(manage ? familyId : undefined);
  const { colors } = useTheme();

  if (plans.isPending) return <Skeleton height={180} />;

  const entries = (plans.data ?? []).flatMap((plan) => plan.items.map((item) => ({ plan, item })));
  const forToday = entries.find(
    (e) => e.item.scheduled_for === today && e.item.status === 'planned',
  );
  const doneToday = entries.some((e) => e.item.scheduled_for === today && e.item.status === 'done');
  const next = entries.find((e) => e.item.scheduled_for > today && e.item.status === 'planned');
  const hasAssessment = (attempts.data ?? []).some((a) => a.status === 'submitted');
  const activeGoals = (goals.data ?? []).filter((g) => g.status === 'active').slice(0, 2);

  return (
    <View style={{ gap: 16 }}>
      {forToday ? (
        <>
          <Text variant="heading">Para hoy</Text>
          <PlanItemCard item={forToday.item} plan={forToday.plan} showDay={false} />
        </>
      ) : entries.length > 0 ? (
        <>
          <Text variant="heading">{doneToday ? '¡Hoy ya lo hicieron!' : 'Hoy, libre'}</Text>
          {next ? (
            <>
              <Text tone="muted">Lo próximo del plan:</Text>
              <PlanItemCard item={next.item} plan={next.plan} />
            </>
          ) : (
            <Text tone="muted">Terminaron el plan de esta semana. ¡Bien ahí!</Text>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={manage && !hasAssessment ? Sprout : CalendarDays}
            title="Tu sugerencia del día"
            description={
              manage
                ? hasAssessment
                  ? 'Armá el plan de la semana y acá vas a ver una idea concreta para cada día.'
                  : 'Hacé la evaluación de hábitos (lleva unos 6 minutos) y armamos un plan a su medida. También podés armar el plan ya.'
                : 'Cuando la persona responsable arme el plan de la semana, acá vas a ver la idea del día.'
            }
            action={
              manage ? (
                <View style={{ gap: 8, alignItems: 'center' }}>
                  <Link href="/plan" asChild>
                    <Button label="Armar el plan de la semana" icon={CalendarDays} />
                  </Link>
                  {!hasAssessment ? (
                    <Link href="/evaluaciones" asChild>
                      <Button
                        label="Hacer la evaluación"
                        variant="secondary"
                        icon={ClipboardList}
                      />
                    </Link>
                  ) : null}
                </View>
              ) : undefined
            }
          />
        </Card>
      )}

      {entries.length > 0 ? (
        <Link href="/plan" asChild>
          <Button label="Ver el plan de la semana" variant="ghost" icon={CalendarDays} />
        </Link>
      ) : null}

      {activeGoals.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text variant="heading">Objetivos en curso</Text>
          {activeGoals.map((g) => {
            const percent = latestProgress(g);
            return (
              <LinkCard
                key={g.id}
                href="/objetivos"
                title={g.title}
                description={
                  percent === null ? 'Sin avances anotados' : `Avance: ${String(percent)}%`
                }
                leading={<Target size={24} color={colors.primary} aria-hidden />}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
