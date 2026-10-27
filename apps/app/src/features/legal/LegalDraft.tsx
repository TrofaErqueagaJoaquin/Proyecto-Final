import { CURRENT_POLICY_VERSION } from '@crecer/shared';

import { Banner, Card, Screen, Text } from '@/ui';

/**
 * Texto legal provisorio. Requiere revisión de un abogado antes de cualquier uso con datos
 * reales (docs/planning/SECURITY_AND_PRIVACY.md §6).
 */
export function LegalDraft({
  title,
  sections,
}: {
  title: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <Screen edges={['bottom']}>
      <Text variant="title">{title}</Text>
      <Banner tone="caution" title="Borrador en revisión">
        Este texto es provisorio y está pendiente de revisión legal. Versión{' '}
        {CURRENT_POLICY_VERSION}.
      </Banner>
      <Card>
        {sections.map(({ heading, body }) => (
          <Text key={heading}>
            <Text variant="bodyStrong">{heading}. </Text>
            {body}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}
