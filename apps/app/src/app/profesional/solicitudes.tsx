import { router } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { ageLabel, SCOPE_LABELS } from '@/features/professionals/labels';
import { useProCases, useRespondCare } from '@/features/professionals/queries';
import { Banner, Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/ui';

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

/** Bandeja de solicitudes: qué pide cada familia y qué te autoriza a ver antes de aceptar. */
export default function RequestsScreen() {
  const cases = useProCases();
  const respond = useRespondCare();

  if (cases.isPending) return <Skeleton height={300} />;
  if (cases.isError) return <ErrorState onRetry={() => void cases.refetch()} />;

  const requests = cases.data.filter((c) => c.status === 'requested');
  return (
    <Screen>
      <Text variant="title">Solicitudes</Text>
      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No tenés solicitudes pendientes"
          description="Cuando una familia te pida acompañamiento, la vas a ver acá."
        />
      ) : (
        requests.map((c) => (
          <Card key={c.id}>
            <Text variant="subheading">{c.family_name}</Text>
            <Text variant="small" tone="muted">
              {`${c.requested_by_name ?? 'La familia'} · ${DATE.format(new Date(c.created_at))}`}
            </Text>
            {c.request_message ? <Text>{`“${c.request_message}”`}</Text> : null}
            <Text variant="bodyStrong">Te autorizan a ver</Text>
            {c.members.map((m) => (
              <View key={m.id} style={{ gap: 2 }}>
                <Text>{`${m.alias} (${ageLabel(m.age_months)})`}</Text>
                <Text variant="small" tone="muted">
                  {m.scopes.map((s) => SCOPE_LABELS[s].label).join(' · ')}
                </Text>
              </View>
            ))}
            {c.family_scopes.length > 0 ? (
              <Text variant="small" tone="muted">
                {`De toda la familia: ${c.family_scopes.map((s) => SCOPE_LABELS[s].label).join(', ')}`}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label="Aceptar"
                loading={
                  respond.isPending &&
                  respond.variables.assignmentId === c.id &&
                  respond.variables.accept
                }
                onPress={() => {
                  respond.mutate(
                    { assignmentId: c.id, accept: true },
                    {
                      onSuccess: () => {
                        router.push('/profesional');
                      },
                    },
                  );
                }}
              />
              <Button
                label="Rechazar"
                variant="secondary"
                loading={
                  respond.isPending &&
                  respond.variables.assignmentId === c.id &&
                  !respond.variables.accept
                }
                onPress={() => {
                  respond.mutate({ assignmentId: c.id, accept: false });
                }}
              />
            </View>
          </Card>
        ))
      )}
      {respond.error ? <Banner tone="danger">{friendlyError(respond.error)}</Banner> : null}
    </Screen>
  );
}
