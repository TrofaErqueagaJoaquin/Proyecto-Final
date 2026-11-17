import { FAMILY_ROLE_DESCRIPTIONS, FAMILY_ROLE_LABELS, type FamilyRole } from '@crecer/shared';
import { Link } from 'expo-router';
import {
  ClipboardList,
  HeartHandshake,
  LogOut,
  Settings2,
  ShieldCheck,
  Smile,
  UserMinus,
  UserPlus,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { BroteEmptyState } from '@/features/brote/Brote';
import { relationshipLabel, roleLabel } from '@/features/families/labels';
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
import { IconGrid, IconTile, useColumnWidth } from '@/features/library/IconTile';
import type { Visual } from '@/features/library/libraryVisuals';
import { LinkCard } from '@/features/library/LinkCard';
import {
  Badge,
  Button,
  Card,
  ChipGroup,
  ConfirmAction,
  Disclosure,
  ErrorBanner,
  ErrorState,
  LoadingScreen,
  makeStyles,
  Screen,
  Sheet,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

const useStyles = makeStyles((t) => ({
  header: { gap: t.space.xs },
  section: { gap: t.space.md },
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
  sheetActions: { gap: t.space.sm },
}));

const TILE_COLUMNS = { phone: 2, tablet: 3, desktop: 4 };
const CHILD_TONES: Visual['tone'][] = ['primary', 'success', 'accent', 'info', 'caution'];
const ADULT_VISUAL: Visual = { icon: UserRound, tone: 'info' };

const ROLE_OPTIONS = (Object.keys(FAMILY_ROLE_LABELS) as FamilyRole[]).map((value) => ({
  value,
  label: FAMILY_ROLE_LABELS[value],
}));

function MembersSection({ familyId, manage }: { familyId: string; manage: boolean }) {
  const styles = useStyles();
  const members = useMembers(familyId);
  const width = useColumnWidth(720, TILE_COLUMNS);
  const [showArchived, setShowArchived] = useState(false);

  if (members.isPending) return <Skeleton height={160} />;
  if (members.isError) {
    return <ErrorState error={members.error} onRetry={() => void members.refetch()} />;
  }

  const active = members.data.filter((m) => m.archived_at === null);
  const archived = members.data.filter((m) => m.archived_at !== null);

  return (
    <View style={styles.section}>
      <Text variant="heading">Chicos</Text>
      {active.length === 0 ? (
        <BroteEmptyState title="Todavía no agregaste a nadie" />
      ) : (
        <IconGrid>
          {active.map((member, index) => (
            <IconTile
              key={member.id}
              visual={{ icon: Smile, tone: CHILD_TONES[index % CHILD_TONES.length] ?? 'primary' }}
              title={member.alias}
              width={width}
              href={`/familia/integrante/${member.id}`}
            />
          ))}
        </IconGrid>
      )}
      {manage ? (
        <Link href="/familia/integrante/nuevo" asChild>
          <Button label="Agregar a un chico o chica" icon={UserPlus} />
        </Link>
      ) : null}
      {archived.length > 0 ? (
        <>
          <Button
            variant="ghost"
            label={
              showArchived
                ? 'Ocultar los que ya no siguen'
                : `Ver los que ya no siguen (${String(archived.length)})`
            }
            onPress={() => {
              setShowArchived((value) => !value);
            }}
          />
          {showArchived ? (
            <IconGrid>
              {archived.map((member) => (
                <IconTile
                  key={member.id}
                  visual={{ icon: Smile, tone: 'caution' }}
                  title={member.alias}
                  width={width}
                  href={`/familia/integrante/${member.id}`}
                />
              ))}
            </IconGrid>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

interface Adult {
  user_id: string;
  role: string;
  relationship: string;
  name: string;
}

/** Ventana de un adulto: su rol (cambiarlo pide confirmar) y "Quitar de la familia". */
function AdultSheet({
  adult,
  familyId,
  editable,
  onClose,
}: {
  adult: Adult;
  familyId: string;
  editable: boolean;
  onClose: () => void;
}) {
  const styles = useStyles();
  const changeRole = useChangeAdultRole(familyId);
  const removeAdult = useRemoveAdult(familyId);
  const [nextRole, setNextRole] = useState<FamilyRole>(adult.role as FamilyRole);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const roleChanged = nextRole !== adult.role;

  if (confirmRemove) {
    return (
      <Sheet visible onClose={onClose} title={`¿Quitar a ${adult.name}?`}>
        <Text>Va a dejar de ver los datos de la familia. Podés volver a invitarla.</Text>
        <ErrorBanner error={removeAdult.error} />
        <View style={styles.sheetActions}>
          <Button
            label="Sí, quitar"
            variant="danger"
            icon={UserMinus}
            fullWidth
            loading={removeAdult.isPending}
            onPress={() => {
              removeAdult.mutate(adult.user_id, { onSuccess: onClose });
            }}
          />
          <Button
            label="Cancelar"
            variant="secondary"
            fullWidth
            disabled={removeAdult.isPending}
            onPress={() => {
              setConfirmRemove(false);
            }}
          />
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible onClose={onClose} title={adult.name}>
      <Badge tone="primary">{`${roleLabel(adult.role)} · ${relationshipLabel(adult.relationship)}`}</Badge>
      {editable ? (
        <>
          <ChipGroup
            label="Rol en la familia"
            options={ROLE_OPTIONS}
            value={nextRole}
            onChange={setNextRole}
          />
          <Text tone="muted">{FAMILY_ROLE_DESCRIPTIONS[nextRole]}</Text>
          <ErrorBanner error={changeRole.error} />
          <View style={styles.sheetActions}>
            {roleChanged ? (
              <Button
                label={`Cambiar a ${FAMILY_ROLE_LABELS[nextRole]}`}
                fullWidth
                loading={changeRole.isPending}
                onPress={() => {
                  changeRole.mutate(
                    { userId: adult.user_id, role: nextRole },
                    { onSuccess: onClose },
                  );
                }}
              />
            ) : null}
            <Button
              label="Quitar de la familia"
              variant="dangerSoft"
              icon={UserMinus}
              fullWidth
              onPress={() => {
                setConfirmRemove(true);
              }}
            />
          </View>
        </>
      ) : (
        <Text tone="muted">{FAMILY_ROLE_DESCRIPTIONS[adult.role as FamilyRole]}</Text>
      )}
    </Sheet>
  );
}

function AdultsSection({
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
  const width = useColumnWidth(720, TILE_COLUMNS);
  const [openId, setOpenId] = useState<string | null>(null);
  const isOwner = myRole === 'owner';

  if (adults.isPending) return <Skeleton height={160} />;
  if (adults.isError) {
    return <ErrorState error={adults.error} onRetry={() => void adults.refetch()} />;
  }

  const list: Adult[] = adults.data.map((a) => ({
    user_id: a.user_id,
    role: a.role,
    relationship: a.relationship,
    name: a.user_id === myUserId ? 'Vos' : (a.profiles?.display_name ?? 'Persona'),
  }));
  const open = list.find((a) => a.user_id === openId);

  return (
    <View style={styles.section}>
      <Text variant="heading">Adultos</Text>
      <IconGrid>
        {list.map((adult) => (
          <IconTile
            key={adult.user_id}
            visual={ADULT_VISUAL}
            title={adult.name}
            width={width}
            onPress={() => {
              setOpenId(adult.user_id);
            }}
          />
        ))}
      </IconGrid>
      {canManage(myRole) ? (
        <Link href="/familia/invitar" asChild>
          <Button label="Invitar a otro adulto" variant="secondary" icon={UserPlus} />
        </Link>
      ) : null}
      {open ? (
        <AdultSheet
          key={open.user_id}
          adult={open}
          familyId={familyId}
          editable={isOwner && open.user_id !== myUserId}
          onClose={() => {
            setOpenId(null);
          }}
        />
      ) : null}
    </View>
  );
}

function InvitationsCard({ familyId }: { familyId: string }) {
  const styles = useStyles();
  const invitations = usePendingInvitations(familyId, true);
  const revoke = useRevokeInvitation(familyId);
  if (!invitations.data || invitations.data.length === 0) return null;
  return (
    <Card>
      <Text variant="subheading">Invitaciones sin responder</Text>
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
            accessibilityLabel={`Cancelar la invitación a ${invitation.email}`}
            loading={revoke.isPending && revoke.variables === invitation.id}
            onPress={() => {
              revoke.mutate(invitation.id);
            }}
          />
        </View>
      ))}
      <ErrorBanner error={revoke.error} />
    </Card>
  );
}

export default function FamilyScreen() {
  const styles = useStyles();
  const auth = useAuth();
  const { isPending, family } = useActiveFamily();
  const removeAdult = useRemoveAdult(family?.id);
  const theme = useTheme();
  const iconColor = theme.colors.primary;

  if (isPending) return <LoadingScreen />;

  if (!family) {
    return (
      <Screen>
        <Text variant="title">Familia</Text>
        <Card>
          <BroteEmptyState
            title="Creá el espacio de tu familia"
            description="Si otra persona ya lo creó, pedile que te invite."
            action={
              <Link href="/bienvenida" asChild>
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
      <MembersSection familyId={family.id} manage={manage} />
      <AdultsSection familyId={family.id} myRole={family.role} myUserId={myUserId} />
      {manage ? <InvitationsCard familyId={family.id} /> : null}
      {manage ? (
        <LinkCard
          href="/evaluaciones"
          title="Chequeos"
          leading={<ClipboardList color={iconColor} size={28} aria-hidden />}
        />
      ) : null}
      {manage ? (
        <LinkCard
          href="/profesionales"
          title="Profesionales"
          leading={<HeartHandshake color={iconColor} size={28} aria-hidden />}
        />
      ) : null}
      {manage ? (
        <LinkCard
          href="/familia/preferencias"
          title="Preferencias"
          leading={<Settings2 color={iconColor} size={28} aria-hidden />}
        />
      ) : null}
      <LinkCard
        href="/privacidad"
        title="Privacidad"
        leading={<ShieldCheck color={iconColor} size={28} aria-hidden />}
      />
      <Disclosure title="Más opciones">
        <ConfirmAction
          label="Salir de esta familia"
          confirmLabel="Sí, salir"
          icon={LogOut}
          description="Vas a dejar de ver los datos de la familia. Si sos el único responsable principal, primero pasale ese rol a otra persona."
          loading={removeAdult.isPending}
          onConfirm={() => {
            removeAdult.mutate(myUserId);
          }}
        />
        <ErrorBanner error={removeAdult.error} />
      </Disclosure>
    </Screen>
  );
}
