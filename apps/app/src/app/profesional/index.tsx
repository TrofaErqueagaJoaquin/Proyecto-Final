import { Link, router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { BroteEmptyState } from '@/features/brote/Brote';
import { VerificationBadge } from '@/features/professionals/components';
import { ageLabel, SCOPE_LABELS } from '@/features/professionals/labels';
import {
  useEndCare,
  useMyProfessionalProfile,
  useProCases,
} from '@/features/professionals/queries';
import {
  Badge,
  Banner,
  Button,
  Card,
  ConfirmAction,
  ErrorBanner,
  ErrorScreen,
  LoadingScreen,
  makeStyles,
  Screen,
  Text,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

const useStyles = makeStyles((t) => ({
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: minTouchTarget + 8,
    paddingVertical: t.space.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  scopes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
}));

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Casos: familias que acompaño y los integrantes que me autorizaron (UX §5.5). */
export default function CasesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const profile = useMyProfessionalProfile();
  const cases = useProCases();
  const end = useEndCare();

  if (cases.isPending) return <LoadingScreen />;
  if (cases.isError)
    return <ErrorScreen error={cases.error} onRetry={() => void cases.refetch()} />;

  const active = cases.data.filter((c) => c.status === 'active');
  const pending = cases.data.filter((c) => c.status === 'requested').length;
  const ended = cases.data.filter((c) => c.status === 'ended');

  return (
    <Screen maxWidth={960}>
      <Text variant="title">Casos</Text>
      {profile.data ? <VerificationBadge status={profile.data.verification_status} /> : null}
      {profile.data && profile.data.verification_status !== 'verified' ? (
        <Banner
          tone="caution"
          title="Todavía no aparecés en el directorio"
          action={
            profile.data.verification_status === 'pending'
              ? undefined
              : {
                  label: 'Cargar mi matrícula',
                  onPress: () => {
                    router.push('/profesional/perfil');
                  },
                }
          }
        >
          {profile.data.verification_status === 'pending'
            ? 'Estamos revisando tu matrícula.'
            : 'Cargá tu matrícula para que las familias te encuentren.'}
        </Banner>
      ) : null}
      {pending > 0 ? (
        <Link href="/profesional/solicitudes" asChild>
          <Button
            label={
              pending === 1
                ? 'Tenés 1 solicitud nueva'
                : `Tenés ${String(pending)} solicitudes nuevas`
            }
          />
        </Link>
      ) : null}

      {active.length === 0 ? (
        <BroteEmptyState
          title="Todavía no acompañás a ninguna familia"
          description="Cuando aceptes una solicitud, la familia aparece acá."
        />
      ) : (
        active.map((c) => (
          <Card key={c.id}>
            <Text variant="subheading">{c.family_name}</Text>
            <Text variant="small" tone="muted">
              {`Pedido por ${c.requested_by_name ?? 'la familia'}${
                c.responded_at ? ` · desde el ${DATE.format(new Date(c.responded_at))}` : ''
              }`}
            </Text>
            {c.members.length === 0 ? (
              <Text tone="muted">La familia quitó el permiso de todos los integrantes.</Text>
            ) : null}
            {c.members.map((m) => (
              <Link key={m.id} href={`/profesional/casos/${c.id}/${m.id}`} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={m.alias}
                  style={styles.member}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="bodyStrong">{m.alias}</Text>
                    <Text variant="small" tone="muted">
                      {ageLabel(m.age_months)}
                    </Text>
                    <View style={styles.scopes}>
                      {m.scopes
                        .filter((s) => s !== 'member_profile')
                        .map((s) => (
                          <Badge key={s}>{SCOPE_LABELS[s].label}</Badge>
                        ))}
                    </View>
                  </View>
                  <ChevronRight color={colors.inkMuted} size={22} aria-hidden />
                </Pressable>
              </Link>
            ))}
            {c.family_scopes.length > 0 ? (
              <Text variant="small" tone="muted">
                {`De toda la familia: ${c.family_scopes.map((s) => SCOPE_LABELS[s].label).join(', ')}`}
              </Text>
            ) : null}
            <ConfirmAction
              label="Finalizar el acompañamiento"
              confirmLabel="Sí, finalizar"
              description="Dejás de ver los datos de la familia. Conservás tus propias observaciones."
              loading={end.isPending && end.variables.assignmentId === c.id}
              onConfirm={() => {
                end.mutate({ assignmentId: c.id });
              }}
            />
          </Card>
        ))
      )}
      <ErrorBanner error={end.error} />

      {ended.length > 0 ? (
        <>
          <Text variant="heading">Finalizados</Text>
          {ended.map((c) => (
            <Text key={c.id} tone="muted">
              {`${c.family_name}${c.ended_at ? ` · hasta el ${DATE.format(new Date(c.ended_at))}` : ''}`}
            </Text>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
