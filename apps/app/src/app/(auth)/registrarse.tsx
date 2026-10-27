import { CURRENT_POLICY_VERSION, SignUpSchema, type SignUpInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen, OAuthButtons, TextLink } from '@/features/auth/components';
import { authRedirectUrl } from '@/features/auth/redirect';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Checkbox, EmptyState, FormTextField, Text } from '@/ui';

export default function SignUpScreen() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { displayName: '', email: '', password: '', acceptTerms: false as true },
  });
  const terms = useController({ control, name: 'acceptTerms' });

  if (auth.status === 'signedIn') return <Redirect href="/hoy" />;

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectUrl('/callback'),
        // La aceptación se convierte en un consentimiento real en el primer ingreso (RequireSession).
        data: { full_name: displayName, terms_version: CURRENT_POLICY_VERSION },
      },
    });
    if (signUpError) {
      setError(friendlyError(signUpError));
      return;
    }
    // Mismo mensaje exista o no la cuenta: no se revela qué correos están registrados.
    setSentTo(email);
  });

  if (sentTo) {
    return (
      <AuthScreen title="Revisá tu correo">
        <EmptyState
          icon={MailCheck}
          title="Te enviamos un enlace de confirmación"
          description={`Abrí el correo que mandamos a ${sentTo} y tocá el enlace para activar tu cuenta. Si no lo ves, revisá la carpeta de spam.`}
          action={<TextLink href="/ingresar">Volver a ingresar</TextLink>}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Crear una cuenta"
      subtitle="Gratis y sin publicidad. Solo pedimos lo necesario."
      footer={
        <Text>
          ¿Ya tenés cuenta? <TextLink href="/ingresar">Ingresar</TextLink>
        </Text>
      }
    >
      <FormTextField
        control={control}
        name="displayName"
        label="¿Cómo querés que te llamemos?"
        autoComplete="name"
        textContentType="name"
      />
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
        hint="Al menos 10 caracteres, con letras y números."
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
      />
      <Checkbox
        checked={terms.field.value === true}
        onChange={(checked) => {
          terms.field.onChange(checked);
        }}
        label="Acepto los términos y la política de privacidad"
        error={terms.fieldState.error?.message}
      >
        <Text>
          Acepto los <TextLink href="/legal/terminos">términos</TextLink> y la{' '}
          <TextLink href="/legal/privacidad">política de privacidad</TextLink>.
        </Text>
      </Checkbox>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button
        label="Crear cuenta"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
      <OAuthButtons />
    </AuthScreen>
  );
}
