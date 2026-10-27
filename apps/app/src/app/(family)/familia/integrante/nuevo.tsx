import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import { friendlyError } from '@/copy/errors';
import { MemberForm } from '@/features/families/MemberForm';
import { canManage, useActiveFamily, useAddMember } from '@/features/families/queries';
import { Banner, Card, Checkbox, Screen, Skeleton, Text } from '@/ui';

export default function NewMemberScreen() {
  const router = useRouter();
  const { isPending, family } = useActiveFamily();
  const addMember = useAddMember(family?.id);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;
  if (!canManage(family.role)) return <Redirect href="/familia" />;

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
              onSuccess: () => {
                router.replace('/familia');
              },
            });
          }}
        >
          <Banner tone="info" title="Antes de guardar">
            Guardamos el apodo, el mes y año de nacimiento y los intereses para adaptar las
            sugerencias a su edad. Solo los ven los adultos de tu familia y los profesionales que
            vos autorices. Podés revocar este consentimiento cuando quieras desde Privacidad: el
            integrante se archiva y sus datos dejan de usarse.
          </Banner>
          <Checkbox
            checked={consent}
            onChange={(value) => {
              setConsent(value);
              setConsentError(false);
            }}
            label="Doy mi consentimiento para guardar estos datos"
            error={
              consentError ? 'Necesitamos tu consentimiento para agregar al integrante.' : undefined
            }
          />
          {addMember.error ? <Banner tone="danger">{friendlyError(addMember.error)}</Banner> : null}
        </MemberForm>
      </Card>
    </Screen>
  );
}
