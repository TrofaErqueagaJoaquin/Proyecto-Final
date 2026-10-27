import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen, TextLink } from '@/features/auth/components';
import { useAcceptTerms, useTermsConsent } from '@/features/auth/queries';
import { safeNextPath } from '@/features/auth/redirect';
import { Banner, Button, Checkbox, Skeleton, Text } from '@/ui';

/** Aceptación de términos para quien ingresó con Google/GitHub o cuando cambia la política. */
export default function WelcomeScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const terms = useTermsConsent();
  const accept = useAcceptTerms();
  const [checked, setChecked] = useState(false);
  const [showError, setShowError] = useState(false);

  if (auth.status === 'loading' || terms.isPending) return <Skeleton height={240} />;
  if (auth.status === 'signedOut') return <Redirect href="/ingresar" />;
  if (terms.data?.accepted) return <Redirect href={safeNextPath(next)} />;

  const hadPrevious = terms.data?.hasAny === true;

  return (
    <AuthScreen
      title={hadPrevious ? 'Actualizamos los términos' : 'Te damos la bienvenida'}
      subtitle="Antes de seguir, necesitamos tu aceptación."
    >
      <Text>
        Crecer en Casa es una herramienta de orientación: no reemplaza la consulta profesional ni
        hace diagnósticos. Pedimos solo los datos necesarios, no mostramos publicidad y no vendemos
        datos.
      </Text>
      <Checkbox
        checked={checked}
        onChange={(value) => {
          setChecked(value);
          setShowError(false);
        }}
        label="Acepto los términos y la política de privacidad"
        error={showError ? 'Necesitamos tu aceptación para continuar.' : undefined}
      >
        <Text>
          Acepto los <TextLink href="/legal/terminos">términos</TextLink> y la{' '}
          <TextLink href="/legal/privacidad">política de privacidad</TextLink>.
        </Text>
      </Checkbox>
      {accept.error ? <Banner tone="danger">{friendlyError(accept.error)}</Banner> : null}
      <Button
        label="Continuar"
        loading={accept.isPending}
        onPress={() => {
          if (!checked) {
            setShowError(true);
            return;
          }
          accept.mutate(undefined, {
            onSuccess: () => {
              router.replace(safeNextPath(next));
            },
          });
        }}
      />
    </AuthScreen>
  );
}
