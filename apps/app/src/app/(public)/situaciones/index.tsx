import { LinkCard } from '@/features/library/LinkCard';
import { useContentList } from '@/features/library/queries';
import { ErrorState, EvidenceChip, Screen, Skeleton, Text } from '@/ui';

export default function SituationsScreen() {
  const situations = useContentList('situation_card');
  return (
    <Screen edges={['bottom']}>
      <Text variant="title">Situaciones difíciles</Text>
      <Text tone="muted">
        Orientaciones para momentos frecuentes. No son protocolos clínicos: si algo te preocupa,
        consultá.
      </Text>
      {situations.isPending ? (
        <Skeleton height={300} />
      ) : situations.isError ? (
        <ErrorState onRetry={() => void situations.refetch()} />
      ) : (
        situations.data.map((s) => (
          <LinkCard
            key={s.slug}
            href={`/situaciones/${s.slug}`}
            title={s.title}
            description={s.summary}
            footer={<EvidenceChip label={s.evidence_label} />}
          />
        ))
      )}
    </Screen>
  );
}
