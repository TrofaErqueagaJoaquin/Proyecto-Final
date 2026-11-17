import { useLocalSearchParams } from 'expo-router';
import { Eye, Lock, LogOut } from 'lucide-react-native';
import { View } from 'react-native';

import { BroteEmptyState } from '@/features/brote/Brote';
import { useActiveFamily, useMembers } from '@/features/families/queries';
import { ProfessionalAvatar, VerificationBadge } from '@/features/professionals/components';
import {
  CARE_STATUS_LABELS,
  GOAL_STATUS_LABELS,
  SCOPE_LABELS,
  type Scope,
  type VerificationStatus,
} from '@/features/professionals/labels';
import { useAssignment, useEndCare, useRevokeGrant } from '@/features/professionals/queries';
import {
  Badge,
  Banner,
  Card,
  ConfirmAction,
  ErrorBanner,
  ErrorScreen,
  LoadingScreen,
  Screen,
  Text,
  useTheme,
} from '@/ui';

const DATE_TIME = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Qué puede ver, quitar permisos, observaciones compartidas y cuándo miró (§5.4). */
export default function AssignmentScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { family } = useActiveFamily();
  const assignment = useAssignment(assignmentId);
  const members = useMembers(family?.id);
  const revoke = useRevokeGrant();
  const end = useEndCare();
  const { colors } = useTheme();

  if (assignment.isPending) return <LoadingScreen />;
  if (assignment.isError) {
    return <ErrorScreen error={assignment.error} onRetry={() => void assignment.refetch()} />;
  }
  if (!assignment.data) {
    return (
      <Screen>
        <BroteEmptyState title="No encontramos este acompañamiento" />
      </Screen>
    );
  }

  const a = assignment.data;
  const name = a.professional_profiles?.display_name ?? 'El profesional';
  const alias = (memberId: string | null) =>
    memberId === null
      ? 'Toda la familia'
      : (members.data?.find((m) => m.id === memberId)?.alias ?? 'Integrante');
  const activeGrants = a.access_grants.filter((g) => g.revoked_at === null);
  const byMember = new Map<string | null, typeof activeGrants>();
  for (const g of activeGrants) {
    byMember.set(g.member_id, [...(byMember.get(g.member_id) ?? []), g]);
  }
  const open = a.status === 'requested' || a.status === 'active';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ProfessionalAvatar name={name} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title">{name}</Text>
          {a.professional_profiles ? (
            <VerificationBadge
              status={a.professional_profiles.verification_status as VerificationStatus}
            />
          ) : null}
        </View>
      </View>
      <Badge tone={a.status === 'active' ? 'primary' : 'neutral'}>
        {CARE_STATUS_LABELS[a.status]}
      </Badge>
      {a.status === 'requested' ? (
        <Banner tone="info">{`Esperando que ${name} acepte. Hasta entonces, no ve nada.`}</Banner>
      ) : null}
      {a.professional_profiles?.public_contact && open ? (
        <Text tone="muted">{`Contacto: ${a.professional_profiles.public_contact}`}</Text>
      ) : null}

      <Card>
        <Text variant="subheading">Qué puede ver</Text>
        {activeGrants.length === 0 ? (
          <Text tone="muted">Ya no ve nada de la familia.</Text>
        ) : (
          [...byMember.entries()].map(([memberId, grants]) => (
            <View key={memberId ?? 'family'} style={{ gap: 4 }}>
              <Text variant="bodyStrong">{alias(memberId)}</Text>
              {grants.map((g) => (
                <View
                  key={g.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Text>{SCOPE_LABELS[g.scope as Scope].label}</Text>
                  <ConfirmAction
                    label="Quitar"
                    title="¿Quitar el permiso?"
                    confirmLabel="Sí, quitar"
                    icon={Lock}
                    description={
                      g.scope === 'member_profile'
                        ? `${name} deja de ver todo lo de ${alias(memberId)}.`
                        : `${name} deja de ver "${SCOPE_LABELS[g.scope as Scope].label}" al instante.`
                    }
                    loading={revoke.isPending && revoke.variables === g.id}
                    onConfirm={() => {
                      revoke.mutate(g.id);
                    }}
                  />
                </View>
              ))}
            </View>
          ))
        )}
        <ErrorBanner error={revoke.error} />
        {revoke.isSuccess ? <Banner tone="success">Listo, ya no lo ve.</Banner> : null}
      </Card>

      {a.observations.length > 0 ? (
        <Card>
          <Text variant="subheading">Observaciones que compartió</Text>
          {a.observations.map((o) => (
            <View key={o.id} style={{ gap: 2 }}>
              <Text variant="small" tone="muted">
                {`${alias(o.member_id)} · ${DATE.format(new Date(o.created_at))}`}
              </Text>
              <Text>{o.body}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {a.goals.length > 0 ? (
        <Card>
          <Text variant="subheading">Objetivos que propuso</Text>
          {a.goals.map((g) => {
            const last = [...g.goal_progress_entries].sort((x, y) =>
              y.recorded_at.localeCompare(x.recorded_at),
            )[0];
            return (
              <View key={g.id} style={{ gap: 2 }}>
                <Text variant="bodyStrong">{g.title}</Text>
                <Text variant="small" tone="muted">
                  {`${alias(g.member_id)} · ${GOAL_STATUS_LABELS[g.status]}${
                    last?.progress != null ? ` · ${String(last.progress)}%` : ''
                  }`}
                </Text>
                {g.description ? <Text>{g.description}</Text> : null}
                {last ? <Text tone="muted">{`Último avance: ${last.note}`}</Text> : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <Text variant="subheading">Cuándo miró</Text>
        {a.activity.length === 0 ? (
          <Text tone="muted">Todavía no miró nada.</Text>
        ) : (
          a.activity.map((event) => (
            <View key={event.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Eye size={16} color={colors.inkMuted} aria-hidden />
              <Text style={{ flex: 1 }}>
                {`Vio a ${alias(event.entity_id)} el ${DATE_TIME.format(
                  new Date(event.occurred_at),
                )}`}
              </Text>
            </View>
          ))
        )}
      </Card>

      {open ? (
        <ConfirmAction
          label={a.status === 'requested' ? 'Cancelar la solicitud' : 'Terminar el acompañamiento'}
          confirmLabel={a.status === 'requested' ? 'Sí, cancelar' : 'Sí, terminar'}
          title={
            a.status === 'requested' ? '¿Cancelar la solicitud?' : '¿Terminar el acompañamiento?'
          }
          icon={LogOut}
          description={`${name} deja de ver todo lo de la familia.`}
          loading={end.isPending}
          onConfirm={() => {
            end.mutate({ assignmentId: a.id });
          }}
        />
      ) : null}
      <ErrorBanner error={end.error} />
    </Screen>
  );
}
