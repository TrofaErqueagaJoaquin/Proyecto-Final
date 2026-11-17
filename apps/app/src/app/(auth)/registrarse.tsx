import { SignUpSchema, type SignUpInput } from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Circle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  ActionLink,
  AuthScreen,
  InvitationNotice,
  OAuthButtons,
  TextLink,
  useCooldown,
} from '@/features/auth/components';
import { rememberInvitation, withNext } from '@/features/auth/pendingInvitation';
import { emailRedirectUrl, safeNextPath } from '@/features/auth/redirect';
import { BroteSays } from '@/features/brote/Brote';
import { supabase } from '@/lib/supabase';
import { Banner, Button, ErrorBanner, FormTextField, makeStyles, Text, useTheme } from '@/ui';

const PASSWORD_RULES = [
  { label: 'Al menos 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'Una letra', test: (value: string) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value) },
  { label: 'Un número', test: (value: string) => /\d/.test(value) },
] as const;

const useStyles = makeStyles((t) => ({
  rules: { gap: t.space.xs, marginTop: -t.space.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
}));

/** Lo que pide la contraseña, tildado a medida que se escribe (sin esperar a enviar). */
function PasswordRules({ control }: { control: Control<SignUpInput> }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const password = useWatch({ control, name: 'password' });
  return (
    <View style={styles.rules}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        const Icon = ok ? Check : Circle;
        return (
          <View
            key={rule.label}
            style={styles.rule}
            accessible
            accessibilityLabel={`${rule.label}: ${ok ? 'listo' : 'falta'}`}
          >
            <Icon color={ok ? colors.success : colors.inkMuted} size={18} aria-hidden />
            <Text variant="small" tone={ok ? 'success' : 'muted'}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Supabase no siempre lo informa (para no revelar cuentas), pero si lo hace, se ofrece ingresar. */
function accountExists(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'user_already_exists' || code === 'email_exists';
}

/**
 * Registro mínimo (rediseño de 2026): Google o correo y contraseña. Nada más: el nombre sale del
 * correo y los términos se aceptan en la bienvenida. Con `next` (por ejemplo, una invitación a una
 * familia), el destino viaja en el enlace de confirmación y en Google hasta la bienvenida.
 */
export default function SignUpScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const confirmUrl = emailRedirectUrl(withNext('/callback?tipo=confirmacion', next));
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

  // Respaldo de la invitación por si el enlace del correo se abre sin `next`.
  useEffect(() => {
    void rememberInvitation(next);
  }, [next]);

  if (auth.status === 'signedIn') return <Redirect href={safeNextPath(next)} />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmUrl },
    });
    if (signUpError) {
      setError(signUpError);
      return;
    }
    // Si el proyecto no pide confirmar el correo, la sesión ya está abierta: directo a la bienvenida.
    if (data.session) {
      router.replace(withNext('/bienvenida', next));
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
        options: { emailRedirectTo: confirmUrl },
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
        <OAuthButtons next={next} />
        <TextLink standalone href={withNext('/ingresar', next)}>
          Ya lo confirmé: ingresar
        </TextLink>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Creá tu cuenta"
      subtitle="Gratis, sin publicidad y en menos de un minuto."
      greeting="¡Hola! Soy Brote. Armemos rutinas lindas en casa."
      footer={
        <TextLink standalone href={withNext('/ingresar', next)}>
          ¿Ya tenés cuenta? Ingresar
        </TextLink>
      }
    >
      <InvitationNotice next={next}>Creá tu cuenta y te sumamos a la familia.</InvitationNotice>
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
      />
      <FormTextField
        control={control}
        name="password"
        label="Contraseña"
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
        onSubmitEditing={() => void onSubmit()}
      />
      <PasswordRules control={control} />
      {accountExists(error) ? (
        <Banner
          tone="caution"
          title="Ya hay una cuenta con ese correo"
          action={{
            label: 'Ingresar',
            onPress: () => {
              router.push(withNext('/ingresar', next));
            },
          }}
        >
          Ingresá con tu contraseña o con Google.
        </Banner>
      ) : (
        <ErrorBanner error={error} />
      )}
      <Button
        label="Crear cuenta"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthScreen>
  );
}
