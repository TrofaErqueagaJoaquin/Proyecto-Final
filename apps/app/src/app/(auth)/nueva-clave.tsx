import { NewPasswordSchema, type NewPasswordInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen } from '@/features/auth/components';
import { BroteSays } from '@/features/brote/Brote';
import { feedback } from '@/features/feedback/feedback';
import { supabase } from '@/lib/supabase';
import { Button, ErrorBanner, FormTextField, Skeleton } from '@/ui';

/**
 * Llega acá desde el enlace de recuperación (con sesión temporal) o desde Perfil. Desde Perfil hay
 * historial: "Cancelar" y el "Listo" vuelven ahí. Desde el enlace no lo hay y se sigue a Hoy.
 */
export default function NewPasswordScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [fromProfile] = useState(() => router.canGoBack());
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const { control, handleSubmit, formState } = useForm<NewPasswordInput>({
    resolver: zodResolver(NewPasswordSchema),
    // Valida cada campo al salir de él y después mientras se corrige.
    mode: 'onTouched',
    defaultValues: { password: '', confirm: '' },
  });

  if (auth.status === 'loading') return <Skeleton height={200} />;
  if (auth.status === 'signedOut') return <Redirect href="/recuperar" />;

  const leave = () => {
    if (fromProfile && router.canGoBack()) router.back();
    else router.replace('/hoy');
  };

  if (saved) {
    return (
      <AuthScreen title="¡Contraseña cambiada!">
        <BroteSays mood="feliz">Listo: la próxima vez entrás con la nueva.</BroteSays>
        <Button label={fromProfile ? 'Volver a Perfil' : 'Seguir'} fullWidth onPress={leave} />
      </AuthScreen>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError);
      return;
    }
    feedback('done');
    setSaved(true);
  });

  return (
    <AuthScreen title="Elegí una contraseña nueva">
      <FormTextField
        control={control}
        name="password"
        label="Contraseña nueva"
        hint="Al menos 8 caracteres, con letras y números."
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
        onSubmitEditing={() => void onSubmit()}
      />
      <ErrorBanner error={error} />
      <Button
        label="Guardar contraseña"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
      <Button
        label="Cancelar"
        variant="ghost"
        fullWidth
        disabled={formState.isSubmitting}
        onPress={leave}
      />
    </AuthScreen>
  );
}
