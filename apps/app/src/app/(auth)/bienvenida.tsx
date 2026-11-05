import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen, TextLink } from '@/features/auth/components';
import { useAcceptTerms, useMe, useTermsConsent } from '@/features/auth/queries';
import { safeNextPath } from '@/features/auth/redirect';
import { AGE_OPTIONS, birthMonthFromAge } from '@/features/families/age';
import { useQuickStart } from '@/features/families/queries';
import { feedback } from '@/features/feedback/feedback';
import { Banner, Button, Checkbox, ChipGroup, Skeleton, Text, TextField } from '@/ui';

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

  if (auth.status === 'signedOut') return <Redirect href="/ingresar" />;
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
        {accept.error ? <Banner tone="danger">{friendlyError(accept.error)}</Banner> : null}
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

  const aliasError = showErrors && alias.trim() === '' ? 'Contanos cómo le decís.' : undefined;
  const ageError = showErrors && age === null ? 'Elegí su edad.' : undefined;
  const termsError = showErrors && !checked ? 'Necesitamos tu aceptación.' : undefined;

  return (
    <AuthScreen title="Empecemos" greeting="¡Hola! Soy Brote. Contame de tu peque y arrancamos.">
      <TextField
        label="¿Cómo le decís?"
        hint="Un apodo alcanza: no hace falta el nombre real."
        value={alias}
        onChangeText={setAlias}
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
      {start.error ? <Banner tone="danger">{friendlyError(start.error)}</Banner> : null}
      <View style={{ gap: 8 }}>
        <Button
          label="¡Empezar!"
          fullWidth
          loading={start.isPending}
          onPress={() => {
            if (alias.trim() === '' || age === null || !checked) {
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
        <Text variant="small" tone="muted" center>
          ¿Sos profesional? <TextLink href="/profesional/perfil">Creá tu perfil</TextLink>
        </Text>
      </View>
    </AuthScreen>
  );
}
