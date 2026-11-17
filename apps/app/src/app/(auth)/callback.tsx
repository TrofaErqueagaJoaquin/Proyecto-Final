import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { AuthScreen, TextLink } from '@/features/auth/components';
import { withNext } from '@/features/auth/pendingInvitation';
import { safeNextPath } from '@/features/auth/redirect';
import { BroteSays } from '@/features/brote/Brote';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Text } from '@/ui';

type Outcome =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  /** El correo quedó confirmado pero la sesión no se pudo abrir acá (otro navegador o teléfono). */
  | { kind: 'confirmed' }
  /** El enlace (de confirmación o de recuperación) venció o ya se usó. */
  | { kind: 'expired' };

/** Supabase devuelve estos errores en inglés: se traducen con el código y nunca se muestran tal cual. */
function linkErrorMessage(error?: string, code?: string): string {
  if (error === 'access_denied') return 'Se canceló el ingreso. Podés probar de nuevo.';
  return friendlyError({ code: code ?? '' });
}

/**
 * Destino de OAuth y de los enlaces por correo (confirmación y recuperación).
 * Intercambia el código PKCE por una sesión y sigue a `next` (solo rutas internas).
 *
 * Con `tipo=confirmacion` (el correo de alta): si la sesión no se puede abrir en este navegador —
 * el enlace se abrió en otro dispositivo o navegador, donde no está el verificador PKCE— el correo
 * igual quedó confirmado, así que se dice eso y se ofrece ingresar, en lugar de un error.
 * Con `next=/nueva-clave` (recuperar la contraseña), el paso siguiente es pedir otro enlace.
 * En el alta, `next` (por ejemplo, una invitación a una familia) se pasa a la bienvenida, o a
 * ingresar si la sesión no se pudo abrir acá, para que no se pierda.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    next?: string;
    tipo?: string;
    error?: string;
    error_description?: string;
    error_code?: string;
  }>();
  const confirmation = params.tipo === 'confirmacion';
  const recovery = params.next?.startsWith('/nueva-clave') === true;
  const [outcome, setOutcome] = useState<Outcome>(() => {
    if (params.error_description || params.error) {
      const expired =
        params.error_code === 'otp_expired' ||
        /expired|invalid/i.test(params.error_description ?? '');
      if (expired && (confirmation || recovery)) return { kind: 'expired' };
      return { kind: 'error', message: linkErrorMessage(params.error, params.error_code) };
    }
    if (!params.code) {
      if (confirmation) return { kind: 'confirmed' };
      if (recovery) return { kind: 'expired' };
      return { kind: 'error', message: 'El enlace no es válido o ya se usó. Pedí uno nuevo.' };
    }
    return { kind: 'loading' };
  });
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || params.error_description || params.error || !params.code) return;
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
        router.replace(
          confirmation ? withNext('/bienvenida', params.next) : safeNextPath(params.next),
        );
      })
      .catch((cause: unknown) => {
        setOutcome(
          confirmation ? { kind: 'confirmed' } : { kind: 'error', message: friendlyError(cause) },
        );
      });
  }, [params.code, params.next, params.error_description, params.error, confirmation, router]);

  if (outcome.kind === 'confirmed') {
    return (
      <AuthScreen title="¡Correo confirmado!">
        <BroteSays mood="feliz">¡Listo! Tu cuenta ya está activa. Entrá y arrancamos.</BroteSays>
        <Link href={withNext('/ingresar', params.next)} asChild>
          <Button label="Ingresar" fullWidth />
        </Link>
        <Text variant="small" tone="muted" center>
          ¿Te registraste desde el celular? Ingresá desde la app.
        </Text>
      </AuthScreen>
    );
  }

  if (outcome.kind === 'expired') {
    return recovery ? (
      <AuthScreen title="El enlace venció">
        <BroteSays mood="pensando">Ese enlace ya no sirve. Pedí otro y seguimos.</BroteSays>
        <Link href="/recuperar" asChild>
          <Button label="Pedir otro enlace" fullWidth />
        </Link>
        <TextLink standalone href="/ingresar">
          Volver a ingresar
        </TextLink>
      </AuthScreen>
    ) : (
      <AuthScreen title="El enlace venció">
        <BroteSays mood="pensando">
          Ese enlace ya no sirve: vencen a las 24 horas o al usarlos una vez.
        </BroteSays>
        <Text>Probá ingresar. Si no entrás, creá la cuenta de nuevo con el mismo correo.</Text>
        <Link href={withNext('/ingresar', params.next)} asChild>
          <Button label="Ingresar" fullWidth />
        </Link>
        <TextLink standalone href={withNext('/registrarse', params.next)}>
          Crear la cuenta de nuevo
        </TextLink>
      </AuthScreen>
    );
  }

  if (outcome.kind === 'error') {
    return (
      <AuthScreen title="No pudimos completar el ingreso">
        <Banner tone="danger">{outcome.message}</Banner>
        {recovery ? (
          <>
            <Link href="/recuperar" asChild>
              <Button label="Pedir otro enlace" fullWidth />
            </Link>
            <TextLink standalone href="/ingresar">
              Volver a ingresar
            </TextLink>
          </>
        ) : (
          <Link href={withNext('/ingresar', params.next)} asChild>
            <Button label="Volver a ingresar" fullWidth />
          </Link>
        )}
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Ingresando…">
      <ActivityIndicator accessibilityLabel="Ingresando" />
      <Text tone="muted" center>
        Estamos verificando tu acceso.
      </Text>
    </AuthScreen>
  );
}
