import { View } from 'react-native';

import { useSettings, useUsageSummary } from '@/features/admin/queries';
import { Card, ErrorState, GrowthLine, Screen, Skeleton, Text } from '@/ui';

const DAY = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric' });

/** Uso de la IA y costo del mes: solo agregados por día (sin personas ni familias). */
export default function UsageScreen() {
  const usage = useUsageSummary();
  const settings = useSettings();

  if (usage.isPending) return <Skeleton height={300} />;
  if (usage.isError) return <ErrorState onRetry={() => void usage.refetch()} />;

  const cost = usage.data.reduce((sum, d) => sum + Number(d.cost_usd), 0);
  const messages = usage.data.reduce((sum, d) => sum + Number(d.messages), 0);
  const budget = Number(settings.data?.get('assistant.monthly_budget_usd') ?? 0);
  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Uso de la IA</Text>
      <Card>
        <Text variant="subheading">{`US$${cost.toFixed(4)} este mes`}</Text>
        {budget > 0 ? (
          <>
            <GrowthLine
              progress={cost / budget}
              label={`${String(Math.round((cost / budget) * 100))}% del tope mensual`}
            />
            <Text variant="small" tone="muted">
              {`Tope: US$${String(budget)}. Al llegar, el asistente se pausa hasta el mes siguiente.`}
            </Text>
          </>
        ) : null}
        <Text>{`${String(messages)} preguntas · ${messages > 0 ? `US$${(cost / messages).toFixed(5)} por pregunta` : 'sin uso'}`}</Text>
      </Card>
      {usage.data.map((d) => (
        <View
          key={d.day}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Text>{DAY.format(new Date(`${d.day}T12:00:00`))}</Text>
          <Text tone="muted">
            {`${String(d.messages)} preguntas · ${String(d.active_users)} personas · US$${Number(d.cost_usd).toFixed(4)}`}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
