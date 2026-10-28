import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useKbDocuments, useSetKbStatus } from '@/features/admin/queries';
import { Badge, Banner, Button, Card, ErrorState, Screen, Skeleton, Text } from '@/ui';

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

/** Base de conocimiento del asistente: qué documentos usa y retirar o volver a incluir. */
export default function KnowledgeScreen() {
  const documents = useKbDocuments();
  const setStatus = useSetKbStatus();

  if (documents.isPending) return <Skeleton height={300} />;
  if (documents.isError) return <ErrorState onRetry={() => void documents.refetch()} />;

  const indexed = documents.data.filter((d) => d.status === 'indexed').length;
  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Base de conocimiento</Text>
      <Text tone="muted">
        {`${String(indexed)} de ${String(documents.data.length)} documentos en uso. Para indexar contenido nuevo o con cambios, corré \`pnpm kb:ingest\` (la subida de PDF propios es P1).`}
      </Text>
      {setStatus.error ? <Banner tone="danger">{friendlyError(setStatus.error)}</Banner> : null}
      {documents.data.map((d) => (
        <Card key={d.id}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Text variant="subheading">{d.title}</Text>
            <Badge tone={d.status === 'indexed' ? 'primary' : 'neutral'}>
              {d.status === 'indexed' ? 'En uso' : 'Retirado'}
            </Badge>
          </View>
          <Text variant="small" tone="muted">
            {`${d.type} · indexado el ${DATE.format(new Date(d.indexed_at))} · ${d.embedding_model ?? 'solo texto'}`}
          </Text>
          <Button
            label={d.status === 'indexed' ? 'Retirar' : 'Volver a usar'}
            variant={d.status === 'indexed' ? 'ghost' : 'secondary'}
            loading={setStatus.isPending && setStatus.variables.id === d.id}
            onPress={() => {
              setStatus.mutate({
                id: d.id,
                status: d.status === 'indexed' ? 'retired' : 'indexed',
              });
            }}
          />
        </Card>
      ))}
    </Screen>
  );
}
