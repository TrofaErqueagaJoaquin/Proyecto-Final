import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import { GuidePopup } from '@/features/brote/GuidePopup';
import { MemberForm } from '@/features/families/MemberForm';
import { canManage, useActiveFamily, useAddMember } from '@/features/families/queries';
import { feedback } from '@/features/feedback/feedback';
import {
  Card,
  Checkbox,
  Disclosure,
  ErrorBanner,
  LoadingScreen,
  Screen,
  Text,
  useOverlayTurn,
} from '@/ui';

export default function NewMemberScreen() {
  const router = useRouter();
  const { isPending, family } = useActiveFamily();
  const addMember = useAddMember(family?.id);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  // Al agregar, Brote propone el paso siguiente: el chequeo de 1 minuto.
  const [added, setAdded] = useState<{ id: string; alias: string } | null>(null);
  const addedVisible = useOverlayTurn('integrante-agregado', added !== null);

  if (isPending) return <LoadingScreen />;
  if (!family) return <Redirect href="/bienvenida" />;
  if (!canManage(family.role)) return <Redirect href="/familia" />;

  const later = () => {
    setAdded(null);
    router.replace('/familia');
  };

  return (
    <Screen>
      <Text variant="title">Agregar integrante</Text>
      <Card>
        <MemberForm
          defaultValues={{ alias: '', birthMonth: '', interests: [] }}
          submitLabel="Agregar"
          loading={addMember.isPending}
          beforeSubmit={() => {
            setConsentError(!consent);
            return consent;
          }}
          onSubmit={(values) => {
            addMember.mutate(values, {
              onSuccess: (id) => {
                feedback('done');
                setAdded({ id, alias: values.alias });
              },
            });
          }}
        >
          <Checkbox
            checked={consent}
            onChange={(value) => {
              setConsent(value);
              setConsentError(false);
            }}
            label="Acepto que guarden estos datos"
            error={consentError ? 'Marcá la casilla para poder agregarlo.' : undefined}
          />
          <Disclosure title="¿Qué guardamos?">
            <Text>
              Solo el apodo, la edad y lo que le gusta, para sugerir actividades. Lo ven los adultos
              de tu familia y los profesionales que vos elijas.
            </Text>
            <Text>Podés retirar este permiso cuando quieras desde Privacidad.</Text>
          </Disclosure>
          <ErrorBanner error={addMember.error} />
        </MemberForm>
      </Card>
      <GuidePopup
        visible={addedVisible}
        celebrate
        title="¡Listo!"
        message={added ? `¿Hacemos el chequeo de 1 minuto de ${added.alias}?` : undefined}
        primary={{
          label: '¡Dale!',
          onPress: () => {
            if (!added) return;
            const { id } = added;
            setAdded(null);
            router.replace(`/chequeo/${id}`);
          },
        }}
        secondary={{ label: 'Más tarde', onPress: later }}
        onClose={later}
      />
    </Screen>
  );
}
