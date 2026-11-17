import { router, type Href } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BroteEmptyState } from '@/features/brote/Brote';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { ageLabel, SCOPE_LABELS } from '@/features/professionals/labels';
import { useProCases, useRespondCare } from '@/features/professionals/queries';
import {
  Button,
  Card,
  ConfirmAction,
  ErrorBanner,
  ErrorScreen,
  LoadingScreen,
  Screen,
  Text,
  useOverlayTurn,
} from '@/ui';

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

/** Bandeja de solicitudes: qué pide cada familia y qué te autoriza a ver antes de aceptar. */
export default function RequestsScreen() {
  const cases = useProCases();
  const respond = useRespondCare();
  // Después de aceptar: festejo de Brote con "Ver el caso" (la tarjeta ya no está en la lista).
  const [accepted, setAccepted] = useState<{ family: string; href: Href } | null>(null);
  const acceptedVisible = useOverlayTurn('solicitud-aceptada', accepted !== null);

  if (cases.isPending) return <LoadingScreen />;
  if (cases.isError) {
    return <ErrorScreen error={cases.error} onRetry={() => void cases.refetch()} />;
  }

  const requests = cases.data.filter((c) => c.status === 'requested');
  return (
    <Screen>
      <Text variant="title">Solicitudes</Text>
      {requests.length === 0 ? (
        <BroteEmptyState
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
                icon={Check}
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
                        const first = c.members[0];
                        setAccepted({
                          family: c.family_name,
                          href: first ? `/profesional/casos/${c.id}/${first.id}` : '/profesional',
                        });
                      },
                    },
                  );
                }}
              />
              <ConfirmAction
                label="Rechazar"
                confirmLabel="Sí, rechazar"
                title={`¿Rechazar a la familia ${c.family_name}?`}
                description="La solicitud se cierra y sale de esta lista."
                icon={X}
                loading={
                  respond.isPending &&
                  respond.variables.assignmentId === c.id &&
                  !respond.variables.accept
                }
                onConfirm={() => {
                  respond.mutate({ assignmentId: c.id, accept: false });
                }}
              />
            </View>
          </Card>
        ))
      )}
      <ErrorBanner error={respond.error} />
      <GuidePopup
        visible={acceptedVisible}
        celebrate
        title={`¡Aceptaste a la familia ${accepted?.family ?? ''}!`}
        message="Ya podés ver lo que te autorizaron."
        primary={{
          label: 'Ver el caso',
          onPress: () => {
            const href = accepted?.href ?? '/profesional';
            setAccepted(null);
            router.push(href);
          },
        }}
        secondary={{
          label: 'Seguir con las solicitudes',
          onPress: () => {
            setAccepted(null);
          },
        }}
        onClose={() => {
          setAccepted(null);
        }}
      />
    </Screen>
  );
}
