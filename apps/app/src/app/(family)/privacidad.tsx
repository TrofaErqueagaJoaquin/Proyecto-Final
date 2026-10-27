import { Redirect } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { CONSENT_LABELS } from '@/features/families/labels';
import {
  canManage,
  useActiveFamily,
  useFamilyConsents,
  useRevokeConsent,
} from '@/features/families/queries';
import { Banner, Card, ConfirmAction, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/ui';

function consequence(purpose: string, alias: string | undefined): string {
  if (purpose === 'child_data') {
    return `${alias ?? 'El integrante'} se archiva: sus datos dejan de usarse y de compartirse.`;
  }
  if (purpose === 'ai_personal_context') {
    return 'El asistente va a responder sin usar los datos de tu familia.';
  }
  return 'Se deja de usar este dato para esa finalidad.';
}

export default function PrivacyScreen() {
  const auth = useAuth();
  const { isPending, family } = useActiveFamily();
  const manage = canManage(family?.role);
  const consents = useFamilyConsents(family?.id, manage);
  const revoke = useRevokeConsent(family?.id);

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;

  return (
    <Screen>
      <Text variant="title">Privacidad</Text>
      <Text tone="muted">
        Cada uso de los datos de tu familia necesita un consentimiento. Acá ves los vigentes y podés
        revocarlos cuando quieras.
      </Text>

      {!manage ? (
        <Banner tone="info">
          Los consentimientos de la familia los gestionan las personas con rol de responsable.
        </Banner>
      ) : consents.isPending ? (
        <Skeleton height={160} />
      ) : consents.isError ? (
        <ErrorState onRetry={() => void consents.refetch()} />
      ) : consents.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No hay consentimientos vigentes"
            description="Cuando agregues integrantes o habilites funciones, van a aparecer acá."
          />
        </Card>
      ) : (
        consents.data.map((consent) => (
          <Card key={consent.id}>
            <View style={{ gap: 4 }}>
              <Text variant="subheading">{CONSENT_LABELS[consent.purpose] ?? consent.purpose}</Text>
              {consent.family_members ? (
                <Text tone="muted">Integrante: {consent.family_members.alias}</Text>
              ) : null}
              <Text variant="small" tone="muted">
                Otorgado el {new Date(consent.granted_at).toLocaleDateString('es-AR')} · versión{' '}
                {consent.policy_version}
              </Text>
            </View>
            <ConfirmAction
              label="Revocar"
              confirmLabel="Sí, revocar"
              description={consequence(consent.purpose, consent.family_members?.alias)}
              loading={revoke.isPending && revoke.variables.consentId === consent.id}
              onConfirm={() => {
                if (auth.status !== 'signedIn') return;
                revoke.mutate({ consentId: consent.id, userId: auth.session.user.id });
              }}
            />
          </Card>
        ))
      )}
      {revoke.error ? <Banner tone="danger">{friendlyError(revoke.error)}</Banner> : null}
    </Screen>
  );
}
