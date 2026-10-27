import { FAMILY_ROLE_LABELS, type FamilyRole } from '@crecer/shared';
import { Link } from 'expo-router';
import { ChevronRight, HeartHandshake, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { LinkCard } from '@/features/library/LinkCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { memberAge, relationshipLabel, roleLabel } from '@/features/families/labels';
import {
  canManage,
  useActiveFamily,
  useAdults,
  useChangeAdultRole,
  useMembers,
  usePendingInvitations,
  useRemoveAdult,
  useRevokeInvitation,
} from '@/features/families/queries';
import {
  Badge,
  Banner,
  Button,
  Card,
  ChipGroup,
  ConfirmAction,
  EmptyState,
  ErrorState,
  makeStyles,
  Screen,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

const useStyles = makeStyles((t) => ({
  header: { gap: t.space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: minTouchTarget + 8,
    paddingVertical: t.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  rowBody: { flex: 1, gap: 2 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
}));

const ROLE_OPTIONS = (Object.keys(FAMILY_ROLE_LABELS) as FamilyRole[]).map((value) => ({
  value,
  label: FAMILY_ROLE_LABELS[value],
}));

function MembersCard({ familyId, manage }: { familyId: string; manage: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const members = useMembers(familyId);
  const [showArchived, setShowArchived] = useState(false);

  if (members.isPending) return <Skeleton height={120} />;
  if (members.isError) return <ErrorState onRetry={() => void members.refetch()} />;

  const active = members.data.filter((m) => m.archived_at === null);
  const archived = members.data.filter((m) => m.archived_at !== null);
  const visible = showArchived ? members.data : active;

  return (
    <Card>
      <Text variant="heading">Integrantes</Text>
      {active.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no agregaste integrantes"
          description="Con un apodo y el mes de nacimiento alcanza para adaptar las sugerencias a su edad."
        />
      ) : null}
      {visible.map((member) => (
        <Link key={member.id} href={`/familia/integrante/${member.id}`} asChild>
          <Pressable accessibilityRole="link" style={styles.row}>
            <View style={styles.rowBody}>
              <Text variant="bodyStrong">{member.alias}</Text>
              <Text variant="small" tone="muted">
                {memberAge(member.birth_month)}
              </Text>
            </View>
            {member.archived_at ? <Badge tone="caution">Archivado</Badge> : null}
            <ChevronRight color={colors.inkMuted} size={20} aria-hidden />
          </Pressable>
        </Link>
      ))}
      {archived.length > 0 ? (
        <Button
          variant="ghost"
          label={
            showArchived ? 'Ocultar archivados' : `Ver archivados (${String(archived.length)})`
          }
          onPress={() => {
            setShowArchived((value) => !value);
          }}
        />
      ) : null}
      {manage ? (
        <Link href="/familia/integrante/nuevo" asChild>
          <Button label="Agregar integrante" icon={UserPlus} />
        </Link>
      ) : null}
    </Card>
  );
}

function AdultsCard({
  familyId,
  myRole,
  myUserId,
}: {
  familyId: string;
  myRole: FamilyRole;
  myUserId: string;
}) {
  const styles = useStyles();
  const adults = useAdults(familyId);
  const changeRole = useChangeAdultRole(familyId);
  const removeAdult = useRemoveAdult(familyId);
  const isOwner = myRole === 'owner';

  if (adults.isPending) return <Skeleton height={120} />;
  if (adults.isError) return <ErrorState onRetry={() => void adults.refetch()} />;

  return (
    <Card>
      <Text variant="heading">Adultos</Text>
      {adults.data.map((adult) => {
        const isMe = adult.user_id === myUserId;
        return (
          <View key={adult.user_id} style={styles.row}>
            <View style={styles.rowBody}>
              <Text variant="bodyStrong">
                {adult.profiles?.display_name ?? 'Persona'}
                {isMe ? ' (vos)' : ''}
              </Text>
              <Text variant="small" tone="muted">
                {roleLabel(adult.role)} · {relationshipLabel(adult.relationship)}
              </Text>
              {isOwner && !isMe ? (
                <>
                  <ChipGroup
                    label={`Rol de ${adult.profiles?.display_name ?? 'esta persona'}`}
                    options={ROLE_OPTIONS}
                    value={adult.role as FamilyRole}
                    onChange={(role) => {
                      changeRole.mutate({ userId: adult.user_id, role });
                    }}
                  />
                  <ConfirmAction
                    label="Quitar de la familia"
                    confirmLabel="Sí, quitar"
                    description="Va a dejar de ver los datos de la familia. Podés volver a invitarla."
                    loading={removeAdult.isPending}
                    onConfirm={() => {
                      removeAdult.mutate(adult.user_id);
                    }}
                  />
                </>
              ) : null}
            </View>
          </View>
        );
      })}
      {changeRole.error ? <Banner tone="danger">{friendlyError(changeRole.error)}</Banner> : null}
      {removeAdult.error ? <Banner tone="danger">{friendlyError(removeAdult.error)}</Banner> : null}
      {canManage(myRole) ? (
        <Link href="/familia/invitar" asChild>
          <Button label="Invitar a otro adulto" variant="secondary" icon={UserPlus} />
        </Link>
      ) : null}
    </Card>
  );
}

function InvitationsCard({ familyId }: { familyId: string }) {
  const styles = useStyles();
  const invitations = usePendingInvitations(familyId, true);
  const revoke = useRevokeInvitation(familyId);
  if (!invitations.data || invitations.data.length === 0) return null;
  return (
    <Card>
      <Text variant="heading">Invitaciones pendientes</Text>
      {invitations.data.map((invitation) => (
        <View key={invitation.id} style={styles.row}>
          <View style={styles.rowBody}>
            <Text variant="bodyStrong">{invitation.email}</Text>
            <Text variant="small" tone="muted">
              {roleLabel(invitation.role)} · vence el{' '}
              {new Date(invitation.expires_at).toLocaleDateString('es-AR')}
            </Text>
          </View>
          <Button
            label="Cancelar"
            variant="ghost"
            loading={revoke.isPending && revoke.variables === invitation.id}
            onPress={() => {
              revoke.mutate(invitation.id);
            }}
          />
        </View>
      ))}
    </Card>
  );
}

export default function FamilyScreen() {
  const styles = useStyles();
  const auth = useAuth();
  const { isPending, family } = useActiveFamily();
  const removeAdult = useRemoveAdult(family?.id);
  const theme = useTheme();

  if (isPending) {
    return (
      <Screen>
        <Skeleton height={36} width="50%" />
        <Skeleton height={160} />
      </Screen>
    );
  }

  if (!family) {
    return (
      <Screen>
        <Text variant="title">Familia</Text>
        <Card>
          <EmptyState
            icon={Users}
            title="Creá el espacio de tu familia"
            description="Si otra persona ya lo creó, pedile que te invite: vas a recibir un enlace."
            action={
              <Link href="/familia/nueva" asChild>
                <Button label="Crear mi familia" />
              </Link>
            }
          />
        </Card>
      </Screen>
    );
  }

  const myUserId = auth.status === 'signedIn' ? auth.session.user.id : '';
  const manage = canManage(family.role);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">{family.name}</Text>
        <Badge tone="primary">{`Tu rol: ${roleLabel(family.role)}`}</Badge>
      </View>
      <MembersCard familyId={family.id} manage={manage} />
      <AdultsCard familyId={family.id} myRole={family.role} myUserId={myUserId} />
      {manage ? <InvitationsCard familyId={family.id} /> : null}
      {manage ? (
        <LinkCard
          href="/profesionales"
          title="Profesionales"
          description="Buscá psicólogas, psicopedagogos, pediatras y terapeutas, y elegí qué compartir con cada uno."
          leading={<HeartHandshake color={theme.colors.primary} size={28} aria-hidden />}
        />
      ) : null}
      <View style={styles.links}>
        {manage ? (
          <Link href="/familia/preferencias" asChild>
            <Button label="Preferencias" variant="secondary" />
          </Link>
        ) : null}
        <Link href="/privacidad" asChild>
          <Button label="Privacidad y consentimientos" variant="secondary" />
        </Link>
      </View>
      <ConfirmAction
        label="Salir de esta familia"
        confirmLabel="Sí, salir"
        description="Vas a dejar de ver los datos de la familia. Si sos el único responsable principal, primero asigná ese rol a otra persona."
        loading={removeAdult.isPending}
        onConfirm={() => {
          removeAdult.mutate(myUserId);
        }}
      />
      {removeAdult.error ? <Banner tone="danger">{friendlyError(removeAdult.error)}</Banner> : null}
    </Screen>
  );
}
