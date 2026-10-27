import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { Check, HeartHandshake } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { ProfessionalAvatar, VerificationBadge } from '@/features/professionals/components';
import {
  ageLabel,
  FAMILY_SCOPES,
  MEMBER_SCOPES,
  SCOPE_LABELS,
  toGrants,
  toggleScope,
  type FamilyScope,
  type ShareSelection,
} from '@/features/professionals/labels';
import { useProfessional, useRequestCare } from '@/features/professionals/queries';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  GrowthLine,
  Screen,
  Skeleton,
  Text,
  TextField,
  useTheme,
} from '@/ui';

const STEPS = ['Profesional', 'Qué compartir', 'Revisar y enviar'] as const;

function monthsSince(birthMonth: string): number {
  const birth = new Date(`${birthMonth}T00:00:00`);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
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
  const { colors } = useTheme();

  // Sin `pro` la consulta queda deshabilitada (y "pendiente" para siempre): no se espera.
  if (isPending || (pro !== undefined && professional.isPending) || members.isPending) {
    return <Skeleton height={300} />;
  }
  if (!family) return <Redirect href="/familia/nueva" />;
  if (!canManage(family.role)) return <Redirect href="/familia" />;
  if (pro !== undefined && professional.isError)
    return <ErrorState onRetry={() => void professional.refetch()} />;
  if (members.isError) return <ErrorState onRetry={() => void members.refetch()} />;
  if (!pro || !professional.data) {
    return (
      <Screen>
        <EmptyState
          icon={HeartHandshake}
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
  const grants = toGrants(selection, familyScopes);
  const nothingChosen = grants.length === 0;

  return (
    <Screen>
      <Text variant="title">Compartir con un profesional</Text>
      <GrowthLine
        progress={(step + 1) / STEPS.length}
        label={`Paso ${String(step + 1)} de ${String(STEPS.length)}: ${STEPS[step] ?? ''}`}
      />
      <Text variant="small" tone="muted">
        {`Paso ${String(step + 1)} de ${String(STEPS.length)} · ${STEPS[step] ?? ''}`}
      </Text>

      {step === 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ProfessionalAvatar name={p.display_name} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="subheading">{p.display_name}</Text>
              <VerificationBadge status={p.verification_status} />
            </View>
          </View>
          <Text tone="muted">
            Le vas a mandar una solicitud. Hasta que la acepte no ve nada, y después ve solo lo que
            elijas en el paso siguiente.
          </Text>
          <TextField
            label="Mensaje (opcional)"
            hint="Contale brevemente por qué la buscan. Evitá datos de salud: eso lo hablan en la consulta."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <Button
            label="Siguiente"
            onPress={() => {
              setStep(1);
            }}
          />
        </Card>
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
                <Text variant="subheading">{m.alias}</Text>
                <Text variant="small" tone="muted">
                  {ageLabel(monthsSince(m.birth_month))}
                </Text>
                {MEMBER_SCOPES.map((scope) => (
                  <View key={scope} style={{ gap: 2 }}>
                    <Checkbox
                      checked={chosen.includes(scope)}
                      label={SCOPE_LABELS[scope].label}
                      onChange={() => {
                        setSelection({ ...selection, [m.id]: toggleScope(chosen, scope) });
                      }}
                    />
                    <Text variant="small" tone="muted" style={{ paddingLeft: 36 }}>
                      {SCOPE_LABELS[scope].description}
                    </Text>
                  </View>
                ))}
              </Card>
            );
          })}
          <Card>
            <Text variant="subheading">Toda la familia</Text>
            {FAMILY_SCOPES.map((scope) => (
              <View key={scope} style={{ gap: 2 }}>
                <Checkbox
                  checked={familyScopes.includes(scope)}
                  label={SCOPE_LABELS[scope].label}
                  onChange={(checked) => {
                    setFamilyScopes(
                      checked ? [...familyScopes, scope] : familyScopes.filter((s) => s !== scope),
                    );
                  }}
                />
                <Text variant="small" tone="muted" style={{ paddingLeft: 36 }}>
                  {SCOPE_LABELS[scope].description}
                </Text>
              </View>
            ))}
          </Card>
          <Text variant="small" tone="muted">
            Nunca se comparten las conversaciones con el asistente, los datos de los adultos ni lo
            que no elijas acá.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              label="Siguiente"
              disabled={nothingChosen}
              onPress={() => {
                setStep(2);
              }}
            />
            <Button
              label="Atrás"
              variant="secondary"
              onPress={() => {
                setStep(0);
              }}
            />
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <Card>
          <Text variant="subheading">{`Vas a compartir con ${p.display_name}`}</Text>
          {grants.map((g) => {
            const who =
              g.member_id === null
                ? 'Toda la familia'
                : (active.find((m) => m.id === g.member_id)?.alias ?? '');
            return (
              <View key={g.member_id ?? 'family'} style={{ gap: 4 }}>
                <Text variant="bodyStrong">{who}</Text>
                {g.scopes.map((scope) => (
                  <View key={scope} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Check size={16} color={colors.success} aria-hidden />
                    <Text>{SCOPE_LABELS[scope as keyof typeof SCOPE_LABELS].label}</Text>
                  </View>
                ))}
              </View>
            );
          })}
          <Banner tone="info" title="Cómo se revoca">
            En Profesionales vas a ver cada permiso con un botón “Revocar”. Al revocarlo, deja de
            tener acceso al instante. También vas a ver cada vez que mire el resumen de un
            integrante.
          </Banner>
          {request.error ? <Banner tone="danger">{friendlyError(request.error)}</Banner> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              label="Enviar solicitud"
              loading={request.isPending}
              onPress={() => {
                request.mutate(
                  { professionalId: p.user_id, message, grants },
                  {
                    onSuccess: (assignmentId) => {
                      router.replace(`/profesionales/${assignmentId}`);
                    },
                  },
                );
              }}
            />
            <Button
              label="Atrás"
              variant="secondary"
              disabled={request.isPending}
              onPress={() => {
                setStep(1);
              }}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
