import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Home, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { ActionLink, AuthScreen, TextLink } from '@/features/auth/components';
import { isInvitationPath, usePendingInvitation } from '@/features/auth/pendingInvitation';
import { useAcceptTerms, useMe, useTermsConsent } from '@/features/auth/queries';
import { safeNextPath } from '@/features/auth/redirect';
import { signOutWasRequested, useSignOut } from '@/features/auth/signOut';
import { AGE_OPTIONS, birthMonthFromAge } from '@/features/families/age';
import { useQuickStart } from '@/features/families/queries';
import { feedback } from '@/features/feedback/feedback';
import { aliasError as validateAlias } from '@/features/forms/validators';
import {
  Button,
  Checkbox,
  ChipGroup,
  ErrorBanner,
  LoadingScreen,
  makeStyles,
  Text,
  TextField,
  useTheme,
} from '@/ui';

const RELATIONSHIPS = [
  { value: 'madre', label: 'Mamá' },
  { value: 'padre', label: 'Papá' },
  { value: 'abuela', label: 'Abuela' },
  { value: 'abuelo', label: 'Abuelo' },
  { value: 'otro', label: 'Otro' },
] as const;

const useStyles = makeStyles((t) => ({
  choices: { gap: t.space.md },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: 88,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  choicePressed: { backgroundColor: t.colors.primarySoft },
  choiceFocused: {
    outlineColor: t.colors.focus,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
  choiceText: { flex: 1, gap: t.space.xs },
}));

function Terms() {
  return (
    <Text>
      Acepto los <TextLink href="/legal/terminos">términos</TextLink> y la{' '}
      <TextLink href="/legal/privacidad">privacidad</TextLink>.
    </Text>
  );
}

/** Tarjeta grande para elegir un camino ("Soy familia" / "Soy profesional"). */
function ChoiceCard({
  icon: Icon,
  title,
  description,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={(state) => {
        // `focused` solo existe en web (react-native-web).
        const { focused } = state as typeof state & { focused?: boolean };
        return [
          styles.choice,
          state.pressed && styles.choicePressed,
          focused === true && styles.choiceFocused,
        ];
      }}
    >
      <Icon color={colors.primary} size={32} aria-hidden />
      <View style={styles.choiceText}>
        <Text variant="subheading">{title}</Text>
        <Text tone="muted">{description}</Text>
      </View>
      <ChevronRight color={colors.inkMuted} size={24} aria-hidden />
    </Pressable>
  );
}

/** Primer paso: el camino. La familia sigue en la bienvenida; el profesional va a su perfil. */
function PathChoice({
  onFamily,
  onProfessional,
}: {
  onFamily: () => void;
  onProfessional: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.choices}>
      <ChoiceCard
        icon={Home}
        title="Soy familia"
        description="Ideas y rutinas para hacer en casa."
        onPress={onFamily}
      />
      <ChoiceCard
        icon={Stethoscope}
        title="Soy profesional"
        description="Sumarme al directorio y acompañar familias."
        onPress={onProfessional}
      />
    </View>
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
 * Bienvenida (rediseño de 2026): primero "Soy familia / Soy profesional"; la familia carga el apodo
 * y la edad, con un único "Acepto", y pasa directo al chequeo de 1 minuto. Quien llega por una
 * invitación (o ya tiene familia) solo acepta los términos. Si `next` no trae la invitación pero
 * quedó guardada al crear la cuenta, se retoma igual: así no termina armando una familia vacía.
 */
export default function WelcomeScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { next: nextParam } = useLocalSearchParams<{ next?: string }>();
  const pending = usePendingInvitation();
  const me = useMe();
  const terms = useTermsConsent();
  const accept = useAcceptTerms();
  const start = useQuickStart();
  const [alias, setAlias] = useState('');
  const [age, setAge] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<string | null>(null);
  const [isFamily, setIsFamily] = useState(false);
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
  if (auth.status === 'loading' || terms.isPending || me.isPending || !pending.ready) {
    return <LoadingScreen lines={0} />;
  }
  const hasFamily = (me.data?.families.length ?? 0) > 0;
  // Profesionales y administración no arman una familia: solo aceptan los términos.
  const otherSpace =
    nextParam?.startsWith('/profesional') === true || nextParam?.startsWith('/admin') === true;
  // La invitación guardada gana sobre el destino de siempre (Hoy), nunca sobre otro espacio ni
  // sobre un `next` propio de quien ya tiene familia.
  const resumePending =
    pending.path !== null &&
    !isInvitationPath(nextParam) &&
    !otherSpace &&
    (!hasFamily || !nextParam || nextParam === '/hoy');
  const next = resumePending ? pending.path : nextParam;
  const viaInvitation = isInvitationPath(next);
  const termsOnly = viaInvitation || hasFamily || otherSpace;
  if (terms.data?.accepted && termsOnly) {
    return <Redirect href={safeNextPath(next)} />;
  }

  // Solo términos: invitación a una familia, alguien que ya tiene familia o un cambio de política.
  if (termsOnly) {
    const title = viaInvitation
      ? '¡Te invitaron a una familia!'
      : terms.data?.hasAny
        ? 'Actualizamos los términos'
        : '¡Qué bueno que llegaste!';
    return (
      <AuthScreen
        title={title}
        greeting={
          viaInvitation ? 'Aceptá los términos y te sumamos.' : 'Antes de seguir, un solo paso.'
        }
        footer={<NotMe onLeave={leave} onStay={stay} />}
      >
        <Checkbox
          checked={checked}
          onChange={(value) => {
            setChecked(value);
            setShowErrors(false);
          }}
          label="Acepto los términos y la privacidad"
          error={showErrors ? 'Marcá la casilla para continuar.' : undefined}
        >
          <Terms />
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

  // Primero, el camino: la familia sigue acá; el profesional va a su perfil (solo acepta términos).
  if (!isFamily) {
    return (
      <AuthScreen
        title="¿Cómo vas a usar Crecer en Casa?"
        greeting="¡Hola! Soy Brote. Contame quién sos y arrancamos."
        footer={<NotMe onLeave={leave} onStay={stay} />}
      >
        <PathChoice
          onFamily={() => {
            feedback('tap');
            setIsFamily(true);
          }}
          onProfessional={() => {
            feedback('tap');
            router.replace('/profesional/perfil');
          }}
        />
      </AuthScreen>
    );
  }

  // El apodo se revisa al salir del campo; edad y aceptación, al tocar "¡Empezar!".
  const aliasError = showErrors || aliasTouched ? validateAlias(alias) : undefined;
  const ageError = showErrors && age === null ? 'Tocá la edad que tiene.' : undefined;
  const termsError = showErrors && !checked ? 'Marcá la casilla para empezar.' : undefined;

  return (
    <AuthScreen
      title="Empecemos"
      greeting="Contame de tu peque y arrancamos."
      footer={
        <>
          <ActionLink
            onPress={() => {
              setIsFamily(false);
            }}
          >
            Volver a elegir
          </ActionLink>
          <NotMe onLeave={leave} onStay={stay} />
        </>
      }
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
        value={relationship ?? ''}
        onChange={setRelationship}
      />
      <Checkbox
        checked={checked}
        onChange={(value) => {
          setChecked(value);
        }}
        label="Acepto los términos y la privacidad"
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
                // "Vos sos…" es opcional: sin elegir, se guarda como "otro".
                relationship: relationship ?? 'otro',
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
      </View>
    </AuthScreen>
  );
}
