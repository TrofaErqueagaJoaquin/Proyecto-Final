import { SignUpSchema, type SignUpInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen, OAuthButtons, TextLink } from '@/features/auth/components';
import { authRedirectUrl } from '@/features/auth/redirect';
import { BroteSays } from '@/features/brote/Brote';
import { supabase } from '@/lib/supabase';
import { Banner, Button, FormTextField, Text } from '@/ui';

/**
 * Registro mínimo (rediseño de 2026): redes sociales primero y, si no, correo y contraseña. Nada
 * más: el nombre sale del correo y los términos se aceptan en la bienvenida.
 */
export default function SignUpScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: '', password: '' },
  });

  if (auth.status === 'signedIn') return <Redirect href="/hoy" />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl('/callback') },
    });
    if (signUpError) {
      setError(friendlyError(signUpError));
      return;
    }
    // Si el proyecto no pide confirmar el correo, la sesión ya está abierta: directo a la bienvenida.
    if (data.session) {
      router.replace('/bienvenida');
      return;
    }
    // Mismo mensaje exista o no la cuenta: no se revela qué correos están registrados.
    setSentTo(email);
  });

  if (sentTo) {
    return (
      <AuthScreen title="¡Ya casi!">
        <BroteSays mood="feliz">{`Te mandé un enlace a ${sentTo}. Tocalo y seguimos.`}</BroteSays>
        <Text tone="muted">
          Si no lo ves en un minuto, mirá en spam o en promociones. Con Google entrás sin esperar.
        </Text>
        <OAuthButtons />
        <TextLink href="/ingresar">Volver a ingresar</TextLink>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Creá tu cuenta"
      subtitle="Gratis, sin publicidad y en menos de un minuto."
      greeting="¡Hola! Soy Brote. Te acompaño a armar rutinas más lindas en casa."
      footer={
        <Text>
          ¿Ya tenés cuenta? <TextLink href="/ingresar">Ingresar</TextLink>
        </Text>
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
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button
        label="Crear cuenta"
        variant="secondary"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthScreen>
  );
}
