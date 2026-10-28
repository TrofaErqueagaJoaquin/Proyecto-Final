import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAdminUsers, usePermissions, useSetRole } from '@/features/admin/queries';
import {
  Badge,
  Banner,
  Card,
  ChipGroup,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

const ROLES = [
  { value: 'platform_admin', label: 'Administración' },
  { value: 'content_editor', label: 'Edición' },
  { value: 'content_publisher', label: 'Publicación' },
  { value: 'credential_verifier', label: 'Verificación' },
  { value: 'auditor', label: 'Auditoría' },
] as const;
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Usuarios y roles administrativos (solo correo, alta y roles: nunca familias). */
export default function UsersScreen() {
  const permissions = usePermissions();
  const [search, setSearch] = useState('');
  const users = useAdminUsers(search.trim());
  const setRole = useSetRole();
  const canManage = permissions.has('users.manage_roles');

  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Usuarios</Text>
      <TextField
        label="Buscar por correo o nombre"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        inputMode="search"
      />
      {setRole.error ? <Banner tone="danger">{friendlyError(setRole.error)}</Banner> : null}
      {users.isPending ? (
        <Skeleton height={300} />
      ) : users.isError ? (
        <ErrorState onRetry={() => void users.refetch()} />
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
                  if (role) setRole.mutate({ userId: u.id, role, grant: added !== undefined });
                }}
              />
            ) : (
              <Text variant="small">
                {u.roles.length > 0 ? `Roles: ${u.roles.join(', ')}` : 'Sin roles administrativos'}
              </Text>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
