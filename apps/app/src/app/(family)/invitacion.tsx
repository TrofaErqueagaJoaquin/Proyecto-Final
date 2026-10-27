import { RELATIONSHIPS } from '@crecer/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { friendlyError } from '@/copy/errors';
import { useAcceptInvitation } from '@/features/families/queries';
import { Banner, Button, Card, ChipGroup, Screen, Text } from '@/ui';

/** Destino del enlace de invitación. La guarda de sesión conserva el token si hay que ingresar. */
export default function AcceptInvitationScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const accept = useAcceptInvitation();
  const [relationship, setRelationship] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  if (!token) {
    return (
      <Screen>
        <Text variant="title">Invitación</Text>
        <Banner tone="danger">El enlace está incompleto. Pedí que te lo vuelvan a enviar.</Banner>
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
          error={showError ? 'Elegí tu vínculo para continuar.' : undefined}
        />
        {accept.error ? <Banner tone="danger">{friendlyError(accept.error)}</Banner> : null}
        <Button
          label="Aceptar invitación"
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
                  router.replace('/familia');
                },
              },
            );
          }}
        />
      </Card>
    </Screen>
  );
}
