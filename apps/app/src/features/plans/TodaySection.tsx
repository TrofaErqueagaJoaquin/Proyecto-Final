import { mondayOf } from '@crecer/domain';
import type { FamilyRole } from '@crecer/shared';
import { Link } from 'expo-router';
import { CalendarDays, Sparkles, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useFamilyAttempts } from '@/features/assessments/queries';
import { BroteSays } from '@/features/brote/Brote';
import { feedback } from '@/features/feedback/feedback';
import { canManage } from '@/features/families/queries';
import { useFamilyProgress } from '@/features/logros/LogrosStrip';
import { latestProgress, useGoals } from '@/features/goals/queries';
import { LinkCard } from '@/features/library/LinkCard';
import { Banner, Button, Card, EmptyState, makeStyles, Skeleton, Text, useTheme } from '@/ui';

import { PlanItemCard } from './PlanItemCard';
import { localDate, useGeneratePlan, useWeekPlans } from './queries';

const useStyles = makeStyles((t) => ({
  hero: {
    gap: t.space.lg,
    padding: t.space.xl,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.primarySoft,
  },
}));

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
  const styles = useStyles();
  const generate = useGeneratePlan();
  const progress = useFamilyProgress(familyId);

  if (plans.isPending) return <Skeleton height={180} />;

  const entries = (plans.data ?? [])
    .flatMap((plan) => plan.items.map((item) => ({ plan, item })))
    .sort((a, b) => a.item.scheduled_for.localeCompare(b.item.scheduled_for));
  const doneToday =
    progress.data?.doneToday === true ||
    entries.some((e) => e.item.scheduled_for === today && e.item.status === 'done');
  // Si hoy no tiene nada asignado (el plan reparte de lunes a domingo), se propone la primera idea
  // pendiente: quien recién se registra puede arrancar en el momento (rediseño de 2026).
  const forToday =
    entries.find((e) => e.item.scheduled_for === today && e.item.status === 'planned') ??
    (doneToday ? undefined : entries.find((e) => e.item.status === 'planned'));
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
      ) : manage ? (
        <View style={styles.hero}>
          <BroteSays mood="hola">
            {hasAssessment
              ? '¿Te armo ideas para esta semana? Una por día, cortitas.'
              : 'Te armo ideas para esta semana. Si después hacés el chequeo, las ajusto.'}
          </BroteSays>
          {generate.error ? <Banner tone="danger">{friendlyError(generate.error)}</Banner> : null}
          <Button
            label="¡Armá mi semana!"
            icon={Sparkles}
            fullWidth
            loading={generate.isPending}
            onPress={() => {
              generate.mutate(
                { familyId, memberId: null, weekStart: mondayOf(today) },
                { onSuccess: () => feedback('done') },
              );
            }}
          />
        </View>
      ) : (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Tu sugerencia del día"
            description="Cuando la persona responsable arme el plan de la semana, acá vas a ver la idea del día."
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
