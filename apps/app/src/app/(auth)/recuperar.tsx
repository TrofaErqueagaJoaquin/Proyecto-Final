import { RequestPasswordResetSchema, type RequestPasswordResetInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ActionLink, AuthScreen, TextLink, useCooldown } from '@/features/auth/components';
import { authRedirectUrl } from '@/features/auth/redirect';
import { supabase } from '@/lib/supabase';
import { Banner, Button, ErrorBanner, FormTextField } from '@/ui';

export default function RequestResetScreen() {
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown(60);
  const { control, handleSubmit, formState, getValues } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(RequestPasswordResetSchema),
    // Valida cada campo al salir de él y después mientras se corrige.
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  /** Pide el enlace. Solo se informan errores de envío (límite de frecuencia, conexión). */
  async function sendLink(email: string): Promise<boolean> {
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl('/callback?next=/nueva-clave'),
      });
      // Si el correo no existe, la respuesta es la misma que si existiera.
      if (resetError) throw resetError;
    } catch (cause) {
      setError(cause);
      return false;
    }
    cooldown.start();
    return true;
  }

  const onSubmit = handleSubmit(async ({ email }) => {
    if (await sendLink(email)) setSent(true);
  });

  if (sent) {
    const waiting = cooldown.left > 0;
    return (
      <AuthScreen title="Revisá tu correo">
        <Banner tone="success" title="Listo">
          Si el correo corresponde a una cuenta, en unos minutos te llega el enlace.
        </Banner>
        <ErrorBanner error={error} />
        <Link href="/ingresar" asChild>
          <Button label="Volver a ingresar" fullWidth />
        </Link>
        <ActionLink
          disabled={waiting || resending}
          onPress={() => {
            setResending(true);
            void sendLink(getValues('email')).finally(() => {
              setResending(false);
            });
          }}
        >
          {resending
            ? 'Reenviando…'
            : waiting
              ? `No me llegó: reenviar en ${String(cooldown.left)} s`
              : 'No me llegó: reenviar'}
        </ActionLink>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Recuperar la contraseña"
      subtitle="Te mandamos un enlace para elegir una contraseña nueva."
      footer={
        <TextLink standalone href="/ingresar">
          Volver a ingresar
        </TextLink>
      }
    >
      <FormTextField
        control={control}
        name="email"
        label="Correo electrónico"
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        inputMode="email"
        onSubmitEditing={() => void onSubmit()}
      />
      <ErrorBanner error={error} />
      <Button
        label="Enviar enlace"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthScreen>
  );
}
