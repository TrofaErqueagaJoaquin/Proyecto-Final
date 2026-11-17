import { SignInSchema, type SignInInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  AuthScreen,
  InvitationNotice,
  OAuthButtons,
  TextLink,
  useCooldown,
} from '@/features/auth/components';
import { rememberInvitation, withNext } from '@/features/auth/pendingInvitation';
import { emailRedirectUrl, safeNextPath } from '@/features/auth/redirect';
import { supabase } from '@/lib/supabase';
import { Banner, Button, FormTextField } from '@/ui';

/** Error del ingreso con lo que se puede hacer al respecto. */
type SignInProblem =
  | { kind: 'credentials' }
  | { kind: 'unconfirmed'; email: string }
  | { kind: 'other'; message: string };

export default function SignInScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [problem, setProblem] = useState<SignInProblem | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const cooldown = useCooldown(60);
  const { control, handleSubmit, formState, setFocus } = useForm<SignInInput>({
    resolver: zodResolver(SignInSchema),
    // Valida cada campo al salir de él y después mientras se corrige.
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  // Respaldo de la invitación por si el camino sigue en otra pantalla (crear la cuenta, Google).
  useEffect(() => {
    void rememberInvitation(next);
  }, [next]);

  if (auth.status === 'signedIn') return <Redirect href={safeNextPath(next)} />;

  const onSubmit = handleSubmit(async (values) => {
    setProblem(null);
    setResent(false);
    const { error: signInError } = await supabase.auth.signInWithPassword(values);
    if (signInError) {
      if (signInError.code === 'invalid_credentials') setProblem({ kind: 'credentials' });
      else if (signInError.code === 'email_not_confirmed')
        setProblem({ kind: 'unconfirmed', email: values.email });
      else setProblem({ kind: 'other', message: friendlyError(signInError) });
      return;
    }
    router.replace(safeNextPath(next));
  });

  async function resendConfirmation(email: string) {
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: emailRedirectUrl(withNext('/callback?tipo=confirmacion', next)),
        },
      });
      if (resendError) throw resendError;
      setResent(true);
      cooldown.start();
    } catch (cause) {
      setProblem({ kind: 'other', message: friendlyError(cause) });
    } finally {
      setResending(false);
    }
  }

  const waiting = cooldown.left > 0;

  return (
    <AuthScreen
      title="Ingresar"
      footer={
        <>
          <TextLink standalone href={withNext('/registrarse', next)}>
            ¿No tenés cuenta? Crear una cuenta
          </TextLink>
          <TextLink standalone href="/recuperar">
            Olvidé mi contraseña
          </TextLink>
        </>
      }
    >
      <InvitationNotice next={next}>
        Ingresá y te sumamos. Si todavía no tenés cuenta, creá una (abajo).
      </InvitationNotice>
      <OAuthButtons leading next={next} />
      <FormTextField
        control={control}
        name="email"
        label="Correo electrónico"
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        inputMode="email"
        onNext={() => {
          setFocus('password');
        }}
      />
      <FormTextField
        control={control}
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        textContentType="password"
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />
      {problem?.kind === 'credentials' ? (
        <Banner
          tone="danger"
          title="El correo o la contraseña no coinciden"
          action={{
            label: 'Recuperar mi contraseña',
            onPress: () => {
              router.push('/recuperar');
            },
          }}
        >
          Revisá cómo los escribiste y probá de nuevo.
        </Banner>
      ) : null}
      {problem?.kind === 'unconfirmed' ? (
        resent ? (
          <Banner tone="success" title="Te lo mandé de nuevo">
            {`Abrí el enlace que llegó a ${problem.email} y después ingresá.`}
          </Banner>
        ) : (
          <Banner
            tone="caution"
            title="Falta confirmar tu correo"
            action={{
              label: waiting
                ? `Reenviar en ${String(cooldown.left)} s`
                : 'Reenviar el correo de confirmación',
              loading: resending,
              onPress: () => {
                if (!waiting) void resendConfirmation(problem.email);
              },
            }}
          >
            {`Te mandamos un enlace a ${problem.email}. Si no lo ves, mirá en spam.`}
          </Banner>
        )
      ) : null}
      {problem?.kind === 'other' ? <Banner tone="danger">{problem.message}</Banner> : null}
      <Button label="Ingresar" loading={formState.isSubmitting} onPress={() => void onSubmit()} />
    </AuthScreen>
  );
}
