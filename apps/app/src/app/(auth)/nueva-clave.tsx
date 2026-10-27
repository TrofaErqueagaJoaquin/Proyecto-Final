import { NewPasswordSchema, type NewPasswordInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen } from '@/features/auth/components';
import { supabase } from '@/lib/supabase';
import { Banner, Button, FormTextField, Skeleton } from '@/ui';

/** Llega acá desde el enlace de recuperación (con sesión temporal) o desde el perfil. */
export default function NewPasswordScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<NewPasswordInput>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  if (auth.status === 'loading') return <Skeleton height={200} />;
  if (auth.status === 'signedOut') return <Redirect href="/recuperar" />;

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(friendlyError(updateError));
      return;
    }
    router.replace('/hoy');
  });

  return (
    <AuthScreen title="Elegí una contraseña nueva">
      <FormTextField
        control={control}
        name="password"
        label="Contraseña nueva"
        hint="Al menos 10 caracteres, con letras y números."
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
      />
      <FormTextField
        control={control}
        name="confirm"
        label="Repetí la contraseña"
        autoComplete="new-password"
        secureTextEntry
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button
        label="Guardar contraseña"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthScreen>
  );
}
