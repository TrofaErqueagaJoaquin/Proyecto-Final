import { SignUpSchema, type SignUpInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  ActionLink,
  AuthScreen,
  OAuthButtons,
  TextLink,
  useCooldown,
} from '@/features/auth/components';
import { emailRedirectUrl } from '@/features/auth/redirect';
import { BroteSays } from '@/features/brote/Brote';
import { supabase } from '@/lib/supabase';
import { Banner, Button, ErrorBanner, FormTextField, Text } from '@/ui';

/**
 * Registro mínimo (rediseño de 2026): redes sociales primero y, si no, correo y contraseña. Nada
 * más: el nombre sale del correo y los términos se aceptan en la bienvenida.
 */
export default function SignUpScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const cooldown = useCooldown(60);
  const { control, handleSubmit, formState } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    // Valida cada campo al salir de él y después mientras se corrige.
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  if (auth.status === 'signedIn') return <Redirect href="/hoy" />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: emailRedirectUrl('/callback?tipo=confirmacion') },
    });
    if (signUpError) {
      setError(signUpError);
      return;
    }
    // Si el proyecto no pide confirmar el correo, la sesión ya está abierta: directo a la bienvenida.
    if (data.session) {
      router.replace('/bienvenida');
      return;
    }
    // Mismo mensaje exista o no la cuenta: no se revela qué correos están registrados.
    setResent(false);
    cooldown.start();
    setSentTo(email);
  });

  async function resend(email: string) {
    setError(null);
    setResent(false);
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: emailRedirectUrl('/callback?tipo=confirmacion') },
      });
      if (resendError) throw resendError;
      setResent(true);
      cooldown.start();
    } catch (cause) {
      setError(cause);
    } finally {
      setResending(false);
    }
  }

  if (sentTo) {
    const waiting = cooldown.left > 0;
    return (
      <AuthScreen title="¡Ya casi!">
        <BroteSays mood="feliz">{`Te mandé un enlace a ${sentTo}. Tocalo y seguimos.`}</BroteSays>
        <Text tone="muted">Si no lo ves en un minuto, mirá en spam o en promociones.</Text>
        {resent ? <Banner tone="success">Te lo mandé de nuevo.</Banner> : null}
        <ErrorBanner error={error} />
        <Button
          label={
            waiting ? `Reenviar el correo en ${String(cooldown.left)} s` : 'Reenviar el correo'
          }
          variant="secondary"
          fullWidth
          loading={resending}
          disabled={waiting}
          onPress={() => void resend(sentTo)}
        />
        <ActionLink
          onPress={() => {
            // Vuelve al formulario con el correo cargado para corregirlo.
            setError(null);
            setResent(false);
            setSentTo(null);
          }}
        >
          Me equivoqué de correo
        </ActionLink>
        <OAuthButtons />
        <TextLink standalone href="/ingresar">
          Ya lo confirmé: ingresar
        </TextLink>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Creá tu cuenta"
      subtitle="Gratis, sin publicidad y en menos de un minuto."
      greeting="¡Hola! Soy Brote. Te acompaño a armar rutinas más lindas en casa."
      footer={
        <TextLink standalone href="/ingresar">
          ¿Ya tenés cuenta? Ingresar
        </TextLink>
      }
    >
      <OAuthButtons leading />
      <FormTextField
        control={control}
        name="email"
        label="Correo electrónico"
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        inputMode="email"
      />
      <FormTextField
        control={control}
        name="password"
        label="Contraseña"
        hint="Al menos 8 caracteres, con letras y números."
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
        onSubmitEditing={() => void onSubmit()}
      />
      <ErrorBanner error={error} />
      <Button
        label="Crear cuenta"
        variant="secondary"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthScreen>
  );
}
