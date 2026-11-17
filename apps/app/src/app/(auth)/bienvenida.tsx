import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { ActionLink, AuthScreen, TextLink } from '@/features/auth/components';
import { useAcceptTerms, useMe, useTermsConsent } from '@/features/auth/queries';
import { safeNextPath } from '@/features/auth/redirect';
import { signOutWasRequested, useSignOut } from '@/features/auth/signOut';
import { AGE_OPTIONS, birthMonthFromAge } from '@/features/families/age';
import { useQuickStart } from '@/features/families/queries';
import { feedback } from '@/features/feedback/feedback';
import { aliasError as validateAlias } from '@/features/forms/validators';
import { Button, Checkbox, ChipGroup, ErrorBanner, Skeleton, Text, TextField } from '@/ui';

const RELATIONSHIPS = [
  { value: 'madre', label: 'Mamá' },
  { value: 'padre', label: 'Papá' },
  { value: 'abuela', label: 'Abuela' },
  { value: 'abuelo', label: 'Abuelo' },
  { value: 'otro', label: 'Otro' },
] as const;

function Terms() {
  return (
    <Text>
      Acepto los <TextLink href="/legal/terminos">términos</TextLink> y la{' '}
      <TextLink href="/legal/privacidad">política de privacidad</TextLink>, y que se guarden estos
      datos para darme ideas.
    </Text>
  );
}

/**
 * Salida para quien entró con otra cuenta o no quiere seguir ahora: cierra la sesión y la pantalla
 * lleva a la portada.
 */
function NotMe({ onLeave, onStay }: { onLeave: () => void; onStay: () => void }) {
  const signOut = useSignOut();
  return (
    <>
      <ErrorBanner error={signOut.error} />
      <ActionLink
        disabled={signOut.isPending}
        onPress={() => {
          onLeave();
          // Si falló pero la sesión local ya se borró (sin internet), la salida igual ocurrió.
          signOut.mutate('local', {
            onError: () => {
              if (!signOutWasRequested()) onStay();
            },
          });
        }}
      >
        {signOut.isPending ? 'Cerrando sesión…' : 'No soy yo · Cerrar sesión'}
      </ActionLink>
    </>
  );
}

/**
 * Bienvenida de un solo paso (rediseño de 2026): Brote pregunta el apodo y la edad, con un único
 * "Acepto", y se pasa directo al chequeo de 1 minuto. Quien llega por una invitación (o ya tiene
 * familia) solo acepta los términos.
 */
export default function WelcomeScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const me = useMe();
  const terms = useTermsConsent();
  const accept = useAcceptTerms();
  const start = useQuickStart();
  const [alias, setAlias] = useState('');
  const [age, setAge] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<string>('otro');
  const [checked, setChecked] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [aliasTouched, setAliasTouched] = useState(false);
  // Si la persona tocó "No soy yo", al cerrarse la sesión va a la portada y no a "Ingresar".
  const [leaving, setLeaving] = useState(false);
  const leave = () => {
    setLeaving(true);
  };
  const stay = () => {
    setLeaving(false);
  };

  if (auth.status === 'signedOut') return <Redirect href={leaving ? '/' : '/ingresar'} />;
  if (auth.status === 'loading' || terms.isPending || me.isPending) {
    return <Skeleton height={320} />;
  }
  const hasFamily = (me.data?.families.length ?? 0) > 0;
  const viaInvitation = next?.startsWith('/invitacion') === true;
  // Profesionales y administración no arman una familia: solo aceptan los términos.
  const otherSpace =
    next?.startsWith('/profesional') === true || next?.startsWith('/admin') === true;
  const termsOnly = viaInvitation || hasFamily || otherSpace;
  if (terms.data?.accepted && (hasFamily || otherSpace)) {
    return <Redirect href={safeNextPath(next)} />;
  }

  // Solo términos: invitación a una familia, alguien que ya tiene familia o un cambio de política.
  if (termsOnly) {
    return (
      <AuthScreen
        title={terms.data?.hasAny ? 'Actualizamos los términos' : '¡Qué bueno que llegaste!'}
        greeting="Antes de seguir, un solo paso."
        footer={<NotMe onLeave={leave} onStay={stay} />}
      >
        <Checkbox
          checked={checked}
          onChange={(value) => {
            setChecked(value);
            setShowErrors(false);
          }}
          label="Acepto los términos y la política de privacidad"
          error={showErrors ? 'Necesitamos tu aceptación para continuar.' : undefined}
        >
          <Text>
            Acepto los <TextLink href="/legal/terminos">términos</TextLink> y la{' '}
            <TextLink href="/legal/privacidad">política de privacidad</TextLink>.
          </Text>
        </Checkbox>
        <ErrorBanner error={accept.error} />
        <Button
          label="Continuar"
          fullWidth
          loading={accept.isPending}
          onPress={() => {
            if (!checked) {
              setShowErrors(true);
              return;
            }
            accept.mutate(undefined, {
              onSuccess: () => {
                router.replace(safeNextPath(next));
              },
            });
          }}
        />
      </AuthScreen>
    );
  }

  // El apodo se revisa al salir del campo; edad y aceptación, al tocar "¡Empezar!".
  const aliasError = showErrors || aliasTouched ? validateAlias(alias) : undefined;
  const ageError = showErrors && age === null ? 'Elegí su edad.' : undefined;
  const termsError = showErrors && !checked ? 'Necesitamos tu aceptación.' : undefined;

  return (
    <AuthScreen
      title="Empecemos"
      greeting="¡Hola! Soy Brote. Contame de tu peque y arrancamos."
      footer={<NotMe onLeave={leave} onStay={stay} />}
    >
      <TextField
        label="¿Cómo le decís?"
        hint="Un apodo alcanza: no hace falta el nombre real."
        value={alias}
        onChangeText={setAlias}
        onBlur={() => {
          setAliasTouched(true);
        }}
        maxLength={40}
        error={aliasError}
        autoCapitalize="words"
      />
      <ChipGroup
        label="¿Cuántos años tiene?"
        options={AGE_OPTIONS}
        value={age ?? ''}
        onChange={(value) => {
          feedback('tap');
          setAge(value);
        }}
        error={ageError}
      />
      <ChipGroup
        label="Vos sos… (opcional)"
        options={RELATIONSHIPS}
        value={relationship}
        onChange={setRelationship}
      />
      <Checkbox
        checked={checked}
        onChange={(value) => {
          setChecked(value);
        }}
        label="Acepto los términos y la política de privacidad, y que se guarden estos datos"
        error={termsError}
      >
        <Terms />
      </Checkbox>
      <ErrorBanner error={start.error} />
      <View style={{ gap: 8 }}>
        <Button
          label="¡Empezar!"
          fullWidth
          loading={start.isPending}
          onPress={() => {
            if (validateAlias(alias) || age === null || !checked) {
              setShowErrors(true);
              return;
            }
            start.mutate(
              {
                acceptTerms: terms.data?.accepted !== true,
                relationship,
                alias: alias.trim(),
                birthMonth: birthMonthFromAge(Number(age)),
              },
              {
                onSuccess: (memberId) => {
                  feedback('done');
                  router.replace(`/chequeo/${memberId}`);
                },
              },
            );
          }}
        />
        <Text variant="small" tone="muted" center>
          Después te hago 6 preguntas rápidas para darte una idea para hoy.
        </Text>
        <TextLink standalone href="/profesional/perfil">
          ¿Sos profesional? Creá tu perfil
        </TextLink>
      </View>
    </AuthScreen>
  );
}
