import { RELATIONSHIPS } from '@crecer/shared';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { clearPendingInvitation } from '@/features/auth/pendingInvitation';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { useAcceptInvitation } from '@/features/families/queries';
import { feedback } from '@/features/feedback/feedback';
import { Banner, Button, Card, ChipGroup, ErrorBanner, Screen, Text } from '@/ui';

/** Errores con los que la invitación ya no sirve: se olvida y se ofrece ir a Hoy. */
function invitationIsDone(error: unknown): boolean {
  const message = (error as { message?: unknown } | null)?.message;
  return (
    typeof message === 'string' &&
    /INVITATION_INVALID|INVITATION_EXPIRED|INVITATION_EMAIL_MISMATCH|ALREADY_MEMBER/.test(message)
  );
}

/** Destino del enlace de invitación. La guarda de sesión conserva el token si hay que ingresar. */
export default function AcceptInvitationScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const accept = useAcceptInvitation();
  const [relationship, setRelationship] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [joined, setJoined] = useState(false);
  const done = accept.isError && invitationIsDone(accept.error);

  // Sin token (o con una invitación que ya no sirve), el respaldo guardado al crear la cuenta no
  // tiene que volver a traer a la persona hasta acá.
  useEffect(() => {
    if (!token || done) void clearPendingInvitation();
  }, [token, done]);

  const goToday = () => {
    setJoined(false);
    router.replace('/hoy');
  };

  if (!token) {
    return (
      <Screen>
        <Text variant="title">Invitación</Text>
        <Banner tone="danger">El enlace está incompleto. Pedí que te lo vuelvan a enviar.</Banner>
        <Link href="/hoy" asChild>
          <Button label="Ir a Hoy" fullWidth />
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">Te invitaron a una familia</Text>
      <Card>
        <Text>
          Al aceptar, vas a ver a los integrantes de la familia y lo que tu rol permita. Podés salir
          cuando quieras.
        </Text>
        <ChipGroup
          label="¿Cuál es tu vínculo con la familia?"
          options={RELATIONSHIPS}
          value={relationship}
          onChange={(value) => {
            setRelationship(value);
            setShowError(false);
          }}
          error={showError ? 'Tocá tu vínculo para continuar.' : undefined}
        />
        <ErrorBanner error={accept.error} />
        {done ? (
          <Link href="/hoy" asChild>
            <Button label="Ir a Hoy" fullWidth />
          </Link>
        ) : (
          <Button
            label="Aceptar invitación"
            fullWidth
            loading={accept.isPending}
            onPress={() => {
              if (!relationship) {
                setShowError(true);
                return;
              }
              accept.mutate(
                { token, relationship },
                {
                  onSuccess: () => {
                    void clearPendingInvitation();
                    feedback('done');
                    setJoined(true);
                  },
                },
              );
            }}
          />
        )}
      </Card>
      <GuidePopup
        visible={joined}
        celebrate
        title="¡Ya sos parte de la familia!"
        message="Desde ahora ven lo mismo y se organizan juntos."
        primary={{ label: 'Ir a Hoy', onPress: goToday }}
        secondary={{
          label: 'Ver la familia',
          onPress: () => {
            setJoined(false);
            router.replace('/familia');
          },
        }}
        onClose={goToday}
      />
    </Screen>
  );
}
