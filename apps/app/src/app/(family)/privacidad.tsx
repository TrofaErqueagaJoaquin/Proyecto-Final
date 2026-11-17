import { Redirect } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { BroteEmptyState } from '@/features/brote/Brote';
import { CONSENT_LABELS } from '@/features/families/labels';
import {
  canManage,
  useActiveFamily,
  useFamilyConsents,
  useRevokeConsent,
} from '@/features/families/queries';
import {
  Banner,
  Card,
  ConfirmAction,
  ErrorBanner,
  ErrorState,
  LoadingScreen,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

function purposeLabel(purpose: string): string {
  return CONSENT_LABELS[purpose] ?? purpose;
}

function consequence(purpose: string, alias: string | undefined): string {
  if (purpose === 'child_data') {
    return `${alias ?? 'El integrante'} se archiva: sus datos dejan de usarse y de compartirse.`;
  }
  if (purpose === 'ai_personal_context') {
    return 'El asistente va a responder sin conocer a tu familia.';
  }
  return 'Dejamos de usar estos datos.';
}

export default function PrivacyScreen() {
  const auth = useAuth();
  const { isPending, family } = useActiveFamily();
  const manage = canManage(family?.role);
  const consents = useFamilyConsents(family?.id, manage);
  const revoke = useRevokeConsent(family?.id);

  if (isPending) return <LoadingScreen />;
  if (!family) return <Redirect href="/bienvenida" />;

  return (
    <Screen>
      <Text variant="title">Privacidad</Text>
      <Text tone="muted">Los permisos que diste. Los podés quitar cuando quieras.</Text>

      {!manage ? (
        <Banner tone="info">Los permisos los manejan los responsables de la familia.</Banner>
      ) : consents.isPending ? (
        <Skeleton height={160} />
      ) : consents.isError ? (
        <ErrorState error={consents.error} onRetry={() => void consents.refetch()} />
      ) : consents.data.length === 0 ? (
        <BroteEmptyState title="Todavía no diste ningún permiso" />
      ) : (
        consents.data.map((consent) => (
          <Card key={consent.id}>
            <View style={{ gap: 4 }}>
              <Text variant="subheading">{purposeLabel(consent.purpose)}</Text>
              {consent.family_members ? (
                <Text tone="muted">{consent.family_members.alias}</Text>
              ) : null}
              <Text variant="small" tone="muted">
                {`Desde el ${DATE.format(new Date(consent.granted_at))}`}
              </Text>
            </View>
            <ConfirmAction
              label="Quitar el permiso"
              confirmLabel="Sí, quitar"
              icon={Lock}
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
      <ErrorBanner error={revoke.error} />
    </Screen>
  );
}
