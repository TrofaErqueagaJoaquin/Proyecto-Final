import { RequestPasswordResetSchema, type RequestPasswordResetInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { friendlyError } from '@/copy/errors';
import { AuthScreen, TextLink } from '@/features/auth/components';
import { authRedirectUrl } from '@/features/auth/redirect';
import { supabase } from '@/lib/supabase';
import { Banner, Button, FormTextField } from '@/ui';

export default function RequestResetScreen() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(RequestPasswordResetSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl('/callback?next=/nueva-clave'),
    });
    // Solo se informan errores de envío (límite de frecuencia, conexión); si el correo no existe,
    // la respuesta es la misma que si existiera.
    if (resetError) {
      setError(friendlyError(resetError));
      return;
    }
    setSent(true);
  });

  return (
    <AuthScreen
      title="Recuperar la contraseña"
      subtitle="Te mandamos un enlace para elegir una contraseña nueva."
      footer={<TextLink href="/ingresar">Volver a ingresar</TextLink>}
    >
      {sent ? (
        <Banner tone="success" title="Listo">
          Si el correo corresponde a una cuenta, en unos minutos vas a recibir el enlace.
        </Banner>
      ) : (
        <>
          <FormTextField
            control={control}
            name="email"
            label="Correo electrónico"
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            inputMode="email"
          />
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <Button
            label="Enviar enlace"
            loading={formState.isSubmitting}
            onPress={() => void onSubmit()}
          />
        </>
      )}
    </AuthScreen>
  );
}
