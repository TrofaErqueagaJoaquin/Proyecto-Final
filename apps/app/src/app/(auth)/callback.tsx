import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { AuthScreen, TextLink } from '@/features/auth/components';
import { safeNextPath } from '@/features/auth/redirect';
import { supabase } from '@/lib/supabase';
import { Banner, Text } from '@/ui';

/**
 * Destino de OAuth y de los enlaces por correo (confirmación y recuperación).
 * Intercambia el código PKCE por una sesión y sigue a `next` (solo rutas internas).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    next?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState<string | null>(
    params.error_description ??
      (params.code ? null : 'El enlace no es válido o ya se usó. Pedí uno nuevo.'),
  );
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || params.error_description || !params.code) return;
    handled.current = true;
    supabase.auth
      .exchangeCodeForSession(params.code)
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          setError(friendlyError(exchangeError));
          return;
        }
        router.replace(safeNextPath(params.next));
      })
      .catch((cause: unknown) => {
        setError(friendlyError(cause));
      });
  }, [params.code, params.next, params.error_description, router]);

  return (
    <AuthScreen title={error ? 'No pudimos completar el ingreso' : 'Ingresando…'}>
      {error ? (
        <>
          <Banner tone="danger">{error}</Banner>
          <TextLink href="/ingresar">Volver a ingresar</TextLink>
        </>
      ) : (
        <>
          <ActivityIndicator accessibilityLabel="Ingresando" />
          <Text tone="muted" center>
            Estamos verificando tu acceso.
          </Text>
        </>
      )}
    </AuthScreen>
  );
}
