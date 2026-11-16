import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { AuthScreen, TextLink } from '@/features/auth/components';
import { safeNextPath } from '@/features/auth/redirect';
import { BroteSays } from '@/features/brote/Brote';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Text } from '@/ui';

type Outcome =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  /** El correo quedó confirmado pero la sesión no se pudo abrir acá (otro navegador o teléfono). */
  | { kind: 'confirmed' }
  /** El enlace de confirmación venció o ya se usó. */
  | { kind: 'expired' };

/**
 * Destino de OAuth y de los enlaces por correo (confirmación y recuperación).
 * Intercambia el código PKCE por una sesión y sigue a `next` (solo rutas internas).
 *
 * Con `tipo=confirmacion` (el correo de alta): si la sesión no se puede abrir en este navegador —
 * el enlace se abrió en otro dispositivo o navegador, donde no está el verificador PKCE— el correo
 * igual quedó confirmado, así que se dice eso y se ofrece ingresar, en lugar de un error.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    next?: string;
    tipo?: string;
    error_description?: string;
    error_code?: string;
  }>();
  const confirmation = params.tipo === 'confirmacion';
  const [outcome, setOutcome] = useState<Outcome>(() => {
    if (params.error_description) {
      const expired =
        params.error_code === 'otp_expired' || /expired|invalid/i.test(params.error_description);
      if (confirmation && expired) return { kind: 'expired' };
      return { kind: 'error', message: params.error_description };
    }
    if (!params.code) {
      return confirmation
        ? { kind: 'confirmed' }
        : { kind: 'error', message: 'El enlace no es válido o ya se usó. Pedí uno nuevo.' };
    }
    return { kind: 'loading' };
  });
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || params.error_description || !params.code) return;
    handled.current = true;
    supabase.auth
      .exchangeCodeForSession(params.code)
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          setOutcome(
            confirmation
              ? { kind: 'confirmed' }
              : { kind: 'error', message: friendlyError(exchangeError) },
          );
          return;
        }
        router.replace(confirmation ? '/bienvenida' : safeNextPath(params.next));
      })
      .catch((cause: unknown) => {
        setOutcome(
          confirmation ? { kind: 'confirmed' } : { kind: 'error', message: friendlyError(cause) },
        );
      });
  }, [params.code, params.next, params.error_description, confirmation, router]);

  if (outcome.kind === 'confirmed') {
    return (
      <AuthScreen title="¡Correo confirmado!">
        <BroteSays mood="feliz">¡Listo! Tu cuenta ya está activa. Entrá y arrancamos.</BroteSays>
        <Link href="/ingresar" asChild>
          <Button label="Ingresar" fullWidth />
        </Link>
        <Text variant="small" tone="muted" center>
          Si te registraste desde la app del celular, volvé a la app e ingresá con tu correo y
          contraseña.
        </Text>
      </AuthScreen>
    );
  }

  if (outcome.kind === 'expired') {
    return (
      <AuthScreen title="El enlace venció">
        <BroteSays mood="pensando">
          Ese enlace ya no sirve: vencen a las 24 horas o al usarlos una vez.
        </BroteSays>
        <Text>
          Probá ingresar: si tu correo ya estaba confirmado, entrás directo. Si no, creá la cuenta
          de nuevo con el mismo correo y te mando otro enlace.
        </Text>
        <Link href="/ingresar" asChild>
          <Button label="Ingresar" fullWidth />
        </Link>
        <TextLink href="/registrarse">Crear la cuenta de nuevo</TextLink>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title={outcome.kind === 'error' ? 'No pudimos completar el ingreso' : 'Ingresando…'}
    >
      {outcome.kind === 'error' ? (
        <>
          <Banner tone="danger">{outcome.message}</Banner>
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
