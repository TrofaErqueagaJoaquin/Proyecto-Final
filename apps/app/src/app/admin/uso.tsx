import { View } from 'react-native';

import { useSettings, useUsageSummary } from '@/features/admin/queries';
import { Card, ErrorScreen, GrowthLine, LoadingScreen, Screen, Text } from '@/ui';

const DAY = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric' });
const MONEY = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Montos con 2 decimales; lo que no llega a un centavo, dicho en palabras. */
function usd(amount: number): string {
  if (amount > 0 && amount < 0.01) return 'menos de US$0,01';
  return `US$${MONEY.format(amount)}`;
}

/** Uso de la IA y costo del mes: solo agregados por día (sin personas ni familias). */
export default function UsageScreen() {
  const usage = useUsageSummary();
  const settings = useSettings();

  if (usage.isPending) return <LoadingScreen lines={2} />;
  if (usage.isError) {
    return <ErrorScreen error={usage.error} onRetry={() => void usage.refetch()} />;
  }

  const cost = usage.data.reduce((sum, d) => sum + Number(d.cost_usd), 0);
  const messages = usage.data.reduce((sum, d) => sum + Number(d.messages), 0);
  const budget = Number(settings.data?.get('assistant.monthly_budget_usd') ?? 0);
  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Uso de la IA</Text>
      <Card>
        <Text variant="subheading">{`${usd(cost)} este mes`}</Text>
        {budget > 0 ? (
          <>
            <GrowthLine
              progress={cost / budget}
              label={`${String(Math.round((cost / budget) * 100))}% del tope de ${usd(budget)}`}
            />
            <Text variant="small" tone="muted">
              Al llegar al tope, el asistente se pausa hasta el mes siguiente.
            </Text>
          </>
        ) : null}
        <Text>
          {messages > 0
            ? `${String(messages)} preguntas · ${usd(cost / messages)} cada una`
            : 'Todavía nadie usó el asistente este mes.'}
        </Text>
      </Card>
      {usage.data.length > 0 ? (
        <Card>
          <Text variant="subheading">Por día</Text>
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
                {`${String(d.messages)} preguntas · ${String(d.active_users)} personas · ${usd(Number(d.cost_usd))}`}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
