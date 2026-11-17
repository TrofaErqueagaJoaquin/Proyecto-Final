import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  Check,
  ClipboardList,
  Flag,
  Info,
  Lock,
  NotebookPen,
  Puzzle,
  Send,
  Target,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BroteEmptyState } from '@/features/brote/Brote';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { useUnsavedGuard } from '@/features/forms/useUnsavedGuard';
import { ProfessionalAvatar, VerificationBadge } from '@/features/professionals/components';
import {
  ageLabel,
  FAMILY_SCOPES,
  MEMBER_SCOPES,
  SCOPE_LABELS,
  toGrants,
  toggleScope,
  type FamilyScope,
  type Scope,
  type ShareSelection,
} from '@/features/professionals/labels';
import { useProfessional, useRequestCare } from '@/features/professionals/queries';
import {
  Banner,
  Button,
  Card,
  Disclosure,
  ErrorBanner,
  ErrorScreen,
  GrowthLine,
  LoadingScreen,
  makeStyles,
  Screen,
  Sheet,
  StepNav,
  Text,
  TextField,
  useOverlayTurn,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

const STEPS = ['Profesional', 'Qué puede ver', 'Revisar y enviar'] as const;

const SCOPE_ICONS: Record<Scope, LucideIcon> = {
  member_profile: UserRound,
  assessments: ClipboardList,
  goals: Target,
  activities: Puzzle,
  observations: NotebookPen,
  family_goals: Flag,
  family_plans: CalendarDays,
};

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
  switch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: minTouchTarget + 8,
    paddingVertical: t.space.xs,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceSunken,
  },
  iconBoxOn: { backgroundColor: t.colors.primarySoft },
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 3,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.borderStrong },
  knobOn: { alignSelf: 'flex-end', backgroundColor: t.colors.onPrimary },
  info: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
}));

function monthsSince(birthMonth: string): number {
  const birth = new Date(`${birthMonth}T00:00:00`);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
}

/** Un permiso: interruptor grande con ícono y título corto; el detalle, en (i). */
function ScopeSwitch({
  scope,
  on,
  onToggle,
  onInfo,
}: {
  scope: Scope;
  on: boolean;
  onToggle: () => void;
  onInfo: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const Icon = SCOPE_ICONS[scope];
  const { label } = SCOPE_LABELS[scope];
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: on }}
        onPress={onToggle}
        style={styles.switch}
      >
        <View style={[styles.iconBox, on && styles.iconBoxOn]}>
          <Icon size={22} color={on ? colors.primary : colors.inkMuted} aria-hidden />
        </View>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {label}
        </Text>
        <View style={[styles.track, on && styles.trackOn]}>
          <View style={[styles.knob, on && styles.knobOn]} />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Qué incluye ${label}`}
        onPress={onInfo}
        style={styles.info}
      >
        <Info size={22} color={colors.inkMuted} aria-hidden />
      </Pressable>
    </View>
  );
}

function ChangeAnytime() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.lock}>
      <Lock size={18} color={colors.success} aria-hidden />
      <Text tone="muted">Lo podés cambiar cuando quieras.</Text>
    </View>
  );
}

/** Compartir con un profesional: asistente de 3 pasos (UX_AND_NAVIGATION.md §5.4). */
export default function ShareScreen() {
  const { pro } = useLocalSearchParams<{ pro?: string }>();
  const { isPending, family } = useActiveFamily();
  const professional = useProfessional(pro);
  const members = useMembers(family?.id);
  const request = useRequestCare(family?.id);
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<ShareSelection>({});
  const [familyScopes, setFamilyScopes] = useState<FamilyScope[]>([]);
  const [message, setMessage] = useState('');
  const [infoScope, setInfoScope] = useState<Scope>('member_profile');
  const [infoOpen, setInfoOpen] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const { colors } = useTheme();

  const grants = toGrants(selection, familyScopes);
  // Si eligió algo y se va sin enviar, se pregunta antes.
  const guard = useUnsavedGuard(sentId === null && (message.trim() !== '' || grants.length > 0));
  const infoVisible = useOverlayTurn('compartir-permiso-info', infoOpen);

  // Ya enviada (y sin el freno de "salir sin guardar"), va a la ficha del acompañamiento.
  useEffect(() => {
    if (sentId !== null) router.replace(`/profesionales/${sentId}`);
  }, [sentId]);

  // Sin `pro` la consulta queda deshabilitada (y "pendiente" para siempre): no se espera.
  if (isPending || (pro !== undefined && professional.isPending) || members.isPending) {
    return <LoadingScreen />;
  }
  if (!family) return <Redirect href="/bienvenida" />;
  if (!canManage(family.role)) return <Redirect href="/familia" />;
  if (pro !== undefined && professional.isError)
    return <ErrorScreen error={professional.error} onRetry={() => void professional.refetch()} />;
  if (members.isError) {
    return <ErrorScreen error={members.error} onRetry={() => void members.refetch()} />;
  }
  if (!pro || !professional.data) {
    return (
      <Screen>
        <BroteEmptyState
          title="Elegí primero un profesional"
          action={
            <Link href="/directorio" asChild>
              <Button label="Ir al directorio" />
            </Link>
          }
        />
      </Screen>
    );
  }

  const p = professional.data;
  const active = members.data.filter((m) => m.archived_at === null);
  const nothingChosen = grants.length === 0;
  const stepLabel = `Paso ${String(step + 1)} de ${String(STEPS.length)} · ${STEPS[step] ?? ''}`;

  return (
    <Screen scrollKey={step}>
      <Text variant="title">Compartir con un profesional</Text>
      <GrowthLine progress={(step + 1) / STEPS.length} label={stepLabel} />
      <Text variant="small" tone="muted">
        {stepLabel}
      </Text>

      {step === 0 ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ProfessionalAvatar name={p.display_name} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="subheading">{p.display_name}</Text>
                <VerificationBadge status={p.verification_status} />
              </View>
            </View>
            <Text tone="muted">Hasta que acepte, no ve nada.</Text>
            <TextField
              label="Mensaje (opcional)"
              hint="Sin datos de salud: eso lo hablan en la consulta."
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
          </Card>
          <StepNav
            onNext={() => {
              setStep(1);
            }}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          {active.length === 0 ? (
            <Banner tone="info">Todavía no cargaron integrantes en la familia.</Banner>
          ) : null}
          {active.map((m) => {
            const chosen = selection[m.id] ?? [];
            return (
              <Card key={m.id}>
                <View style={{ gap: 2 }}>
                  <Text variant="subheading">{m.alias}</Text>
                  <Text variant="small" tone="muted">
                    {ageLabel(monthsSince(m.birth_month))}
                  </Text>
                </View>
                {MEMBER_SCOPES.map((scope) => (
                  <ScopeSwitch
                    key={scope}
                    scope={scope}
                    on={chosen.includes(scope)}
                    onToggle={() => {
                      setSelection({ ...selection, [m.id]: toggleScope(chosen, scope) });
                    }}
                    onInfo={() => {
                      setInfoScope(scope);
                      setInfoOpen(true);
                    }}
                  />
                ))}
              </Card>
            );
          })}
          <Card>
            <Text variant="subheading">Toda la familia</Text>
            {FAMILY_SCOPES.map((scope) => {
              const on = familyScopes.includes(scope);
              return (
                <ScopeSwitch
                  key={scope}
                  scope={scope}
                  on={on}
                  onToggle={() => {
                    setFamilyScopes(
                      on ? familyScopes.filter((s) => s !== scope) : [...familyScopes, scope],
                    );
                  }}
                  onInfo={() => {
                    setInfoScope(scope);
                    setInfoOpen(true);
                  }}
                />
              );
            })}
          </Card>
          <ChangeAnytime />
          <Disclosure title="Qué nunca ve">
            <Text>
              Las charlas con el asistente, los datos de los adultos y lo que no elijas acá.
            </Text>
          </Disclosure>
          <StepNav
            onBack={() => {
              setStep(0);
            }}
            nextDisabled={nothingChosen}
            onNext={() => {
              setStep(2);
            }}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Card>
            <Text variant="subheading">{`${p.display_name} va a ver`}</Text>
            {grants.map((g) => {
              const who =
                g.member_id === null
                  ? 'Toda la familia'
                  : (active.find((m) => m.id === g.member_id)?.alias ?? '');
              return (
                <View key={g.member_id ?? 'family'} style={{ gap: 4 }}>
                  <Text variant="bodyStrong">{who}</Text>
                  {g.scopes.map((scope) => (
                    <View
                      key={scope}
                      style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
                    >
                      <Check size={18} color={colors.success} aria-hidden />
                      <Text>{SCOPE_LABELS[scope as Scope].label}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            <ChangeAnytime />
          </Card>
          <ErrorBanner error={request.error} />
          <StepNav
            onBack={() => {
              setStep(1);
            }}
            nextLabel="Enviar solicitud"
            nextIcon={Send}
            loading={request.isPending}
            onNext={() => {
              request.mutate(
                { professionalId: p.user_id, message, grants },
                {
                  onSuccess: (assignmentId) => {
                    setSentId(assignmentId);
                  },
                },
              );
            }}
          />
        </>
      ) : null}

      <Sheet
        visible={infoVisible}
        onClose={() => {
          setInfoOpen(false);
        }}
        title={SCOPE_LABELS[infoScope].label}
      >
        <Text>{SCOPE_LABELS[infoScope].description}</Text>
        <Button
          label="Entendido"
          fullWidth
          onPress={() => {
            setInfoOpen(false);
          }}
        />
      </Sheet>
      {guard.dialog}
    </Screen>
  );
}
