import { ShieldCheck, ShieldOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAdminUsers, usePermissions, useSetRole } from '@/features/admin/queries';
import { BroteEmptyState } from '@/features/brote/Brote';
import {
  Badge,
  Banner,
  Button,
  Card,
  ChipGroup,
  ErrorBanner,
  ErrorState,
  Screen,
  Sheet,
  Skeleton,
  Text,
  TextField,
  useOverlayTurn,
} from '@/ui';

const ROLES = [
  { value: 'platform_admin', label: 'Administración' },
  { value: 'content_editor', label: 'Edición' },
  { value: 'content_publisher', label: 'Publicación' },
  { value: 'credential_verifier', label: 'Verificación' },
  { value: 'auditor', label: 'Auditoría' },
] as const;
const ROLE_LABEL = new Map<string, string>(ROLES.map((r) => [r.value, r.label]));
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
/** Cuánto queda a la vista el aviso "Listo". */
const DONE_MS = 4000;

interface PendingChange {
  userId: string;
  name: string;
  role: string;
  grant: boolean;
}

/** Usuarios y roles administrativos (solo correo, alta y roles: nunca familias). */
export default function UsersScreen() {
  const permissions = usePermissions();
  const [search, setSearch] = useState('');
  const query = search.trim();
  const users = useAdminUsers(query);
  const setRole = useSetRole();
  const canManage = permissions.has('users.manage_roles');
  // Un toque en un chip no cambia nada: primero se confirma en una ventana.
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const sheetVisible = useOverlayTurn('cambiar-rol', pending !== null);

  useEffect(() => {
    if (done === null) return;
    const timer = setTimeout(() => {
      setDone(null);
    }, DONE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [done]);

  const close = () => {
    if (!setRole.isPending) setPending(null);
  };
  const confirm = () => {
    if (!pending) return;
    const change = pending;
    setRole.mutate(
      { userId: change.userId, role: change.role, grant: change.grant },
      {
        onSuccess: () => {
          setDone(
            change.grant
              ? `Listo: ${change.name} ya tiene el rol ${ROLE_LABEL.get(change.role) ?? ''}.`
              : `Listo: ${change.name} ya no tiene el rol ${ROLE_LABEL.get(change.role) ?? ''}.`,
          );
          setPending(null);
        },
        onError: () => {
          setPending(null);
        },
      },
    );
  };
  const roleName = pending ? (ROLE_LABEL.get(pending.role) ?? '') : '';

  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Usuarios</Text>
      <TextField
        label="Buscar por correo o nombre"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        inputMode="search"
        returnKeyType="search"
      />
      <ErrorBanner error={setRole.error} />
      {done ? (
        <View accessibilityLiveRegion="polite">
          <Banner tone="success">{done}</Banner>
        </View>
      ) : null}
      {users.isPending ? (
        <Skeleton height={300} />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : users.data.length === 0 ? (
        <BroteEmptyState
          title={
            query ? 'No encontramos a nadie con ese correo o nombre' : 'Todavía no hay cuentas'
          }
          action={
            query ? (
              <Button
                label="Borrar la búsqueda"
                variant="secondary"
                onPress={() => {
                  setSearch('');
                }}
              />
            ) : undefined
          }
        />
      ) : (
        users.data.map((u) => (
          <Card key={u.id}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Text variant="subheading">{u.display_name}</Text>
              {u.is_professional ? <Badge>Profesional</Badge> : null}
            </View>
            <Text variant="small" tone="muted">
              {`${u.email} · desde el ${DATE.format(new Date(u.created_at))}`}
            </Text>
            {canManage ? (
              <ChipGroup
                multiple
                label="Roles administrativos"
                options={ROLES}
                value={u.roles}
                onChange={(next) => {
                  const added = next.find((r) => !u.roles.includes(r));
                  const removed = u.roles.find((r) => !next.includes(r));
                  const role = added ?? removed;
                  if (role) {
                    setPending({
                      userId: u.id,
                      name: u.display_name,
                      role,
                      grant: added !== undefined,
                    });
                  }
                }}
              />
            ) : (
              <Text variant="small">
                {u.roles.length > 0
                  ? `Roles: ${u.roles.map((r) => ROLE_LABEL.get(r) ?? r).join(', ')}`
                  : 'Sin roles administrativos'}
              </Text>
            )}
          </Card>
        ))
      )}

      <Sheet
        visible={sheetVisible}
        onClose={close}
        title={
          pending?.grant === false
            ? `¿Quitarle a ${pending.name} el rol ${roleName}?`
            : `¿Darle a ${pending?.name ?? ''} el rol ${roleName}?`
        }
      >
        <Text>
          {pending?.grant === false
            ? 'Deja de poder usar esa parte de la administración.'
            : 'Va a poder usar esa parte de la administración.'}
        </Text>
        <View style={{ gap: 8 }}>
          <Button
            label={pending?.grant === false ? 'Sí, quitarlo' : 'Sí, darlo'}
            variant={pending?.grant === false ? 'danger' : 'primary'}
            icon={pending?.grant === false ? ShieldOff : ShieldCheck}
            loading={setRole.isPending}
            fullWidth
            onPress={confirm}
          />
          <Button
            label="Cancelar"
            variant="secondary"
            disabled={setRole.isPending}
            fullWidth
            onPress={close}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
