import { CircleCheck, CircleOff } from 'lucide-react-native';
import { View } from 'react-native';

import { useKbDocuments, useSetKbStatus } from '@/features/admin/queries';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  ErrorBanner,
  ErrorScreen,
  LoadingScreen,
  Screen,
  Text,
} from '@/ui';

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

/** Base de conocimiento del asistente: qué documentos usa y retirar o volver a incluir. */
export default function KnowledgeScreen() {
  const documents = useKbDocuments();
  const setStatus = useSetKbStatus();

  if (documents.isPending) return <LoadingScreen />;
  if (documents.isError) {
    return <ErrorScreen error={documents.error} onRetry={() => void documents.refetch()} />;
  }

  const inUse = documents.data.filter((d) => d.status === 'indexed').length;
  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Base de conocimiento</Text>
      <Text tone="muted">
        {`${String(inUse)} de ${String(documents.data.length)} documentos en uso por el asistente.`}
      </Text>
      <ErrorBanner error={setStatus.error} />
      {documents.data.map((d) => {
        const used = d.status === 'indexed';
        const busy = setStatus.isPending && setStatus.variables.id === d.id;
        return (
          <Card key={d.id}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Text variant="subheading">{d.title}</Text>
              <Badge tone={used ? 'primary' : 'neutral'} icon={used ? CircleCheck : CircleOff}>
                {used ? 'En uso' : 'Retirado'}
              </Badge>
            </View>
            <Text variant="small" tone="muted">
              {`Actualizado el ${DATE.format(new Date(d.indexed_at))}`}
            </Text>
            {used ? (
              <ConfirmAction
                label="Retirar"
                confirmLabel="Sí, retirar"
                description="El asistente deja de usarlo. Lo podés volver a sumar."
                loading={busy}
                onConfirm={() => {
                  setStatus.mutate({ id: d.id, status: 'retired' });
                }}
              />
            ) : (
              <Button
                label="Volver a usar"
                variant="secondary"
                loading={busy}
                onPress={() => {
                  setStatus.mutate({ id: d.id, status: 'indexed' });
                }}
              />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
