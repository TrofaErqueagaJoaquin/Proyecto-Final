import { EVIDENCE_LABELS } from '@crecer/shared';

import { SourceList } from '@/features/library/SourceList';
import { useSources } from '@/features/library/queries';
import { Card, ErrorState, EvidenceChip, Screen, Skeleton, Text } from '@/ui';

/** Cómo leemos la evidencia y la bibliografía completa (UX_AND_NAVIGATION.md §4). */
export default function EvidenceScreen() {
  const sources = useSources();
  return (
    <Screen edges={['bottom']}>
      <Text variant="title">Sobre la evidencia</Text>
      <Text>
        El problema no son “las pantallas” en sí, sino lo que el uso digital desplaza (sueño,
        movimiento, juego, conversación), el contexto en que se usa y el diseño de las plataformas.
        Por eso cada contenido dice qué tan firme es lo que afirma.
      </Text>
      <Card>
        <Text variant="subheading">Qué significa cada etiqueta</Text>
        {Object.keys(EVIDENCE_LABELS).map((label) => (
          <EvidenceChip key={label} label={label} showHelp />
        ))}
      </Card>
      <Card>
        <Text variant="subheading">Asociación no es causa</Text>
        <Text>
          Casi toda la evidencia sobre pantallas en la infancia es observacional: muestra que dos
          cosas aparecen juntas, no que una cause la otra. Por ejemplo, un chico más irritable puede
          recibir más el celular para calmarse, en lugar de que el celular lo vuelva irritable.
        </Text>
      </Card>
      <Card>
        {sources.isPending ? (
          <Skeleton height={200} />
        ) : sources.isError ? (
          <ErrorState onRetry={() => void sources.refetch()} />
        ) : (
          <SourceList refs={sources.data.map((s) => ({ locator: null, sources: s }))} />
        )}
      </Card>
    </Screen>
  );
}
