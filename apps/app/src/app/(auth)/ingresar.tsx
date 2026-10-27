import { SignInSchema, type SignInInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen, OAuthButtons, TextLink } from '@/features/auth/components';
import { safeNextPath } from '@/features/auth/redirect';
import { supabase } from '@/lib/supabase';
import { Banner, Button, FormTextField, Text } from '@/ui';

export default function SignInScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInInput>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  if (auth.status === 'signedIn') return <Redirect href={safeNextPath(next)} />;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword(values);
    if (signInError) {
      setError(friendlyError(signInError));
      return;
    }
    router.replace(safeNextPath(next));
  });

  return (
    <AuthScreen
      title="Ingresar"
      subtitle="Tu espacio para acompañar el crecimiento en casa."
      footer={
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text>
            ¿No tenés cuenta? <TextLink href="/registrarse">Crear una cuenta</TextLink>
          </Text>
          <TextLink href="/recuperar">Olvidé mi contraseña</TextLink>
        </View>
      }
    >
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
        autoComplete="current-password"
        textContentType="password"
        secureTextEntry
        onSubmitEditing={() => void onSubmit()}
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button label="Ingresar" loading={formState.isSubmitting} onPress={() => void onSubmit()} />
      <OAuthButtons />
    </AuthScreen>
  );
}
