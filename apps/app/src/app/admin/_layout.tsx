import { Link, Slot } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';

import { adminNav } from '@/features/admin/nav';
import { usePermissions } from '@/features/admin/queries';
import { useMe } from '@/features/auth/queries';
import { MfaChallenge, useMfaStatus } from '@/features/auth/mfa';
import { RequireSession } from '@/features/auth/RequireSession';
import { AppShell } from '@/features/shell/AppShell';
import { Button, EmptyState, ErrorState, Screen, Skeleton } from '@/ui';

function AdminShell() {
  const me = useMe();
  const permissions = usePermissions();
  const mfa = useMfaStatus();

  if (me.isPending || mfa.isPending) {
    return (
      <Screen>
        <Skeleton height={32} width="50%" />
        <Skeleton height={160} />
      </Screen>
    );
  }
  if (me.isError) return <ErrorState onRetry={() => void me.refetch()} />;
  if (mfa.isError) return <ErrorState onRetry={() => void mfa.refetch()} />;
  if (permissions.size === 0) {
    return (
      <Screen>
        <EmptyState
          icon={ShieldAlert}
          title="No tenés acceso a esta sección"
          action={
            <Link href="/hoy" asChild>
              <Button label="Volver a mi espacio" />
            </Link>
          }
        />
      </Screen>
    );
  }
  // Toda la administración exige segundo factor (las políticas de la base piden aal2).
  if (mfa.data.level !== 'aal2') {
    return (
      <Screen>
        {mfa.data.factorId ? (
          <MfaChallenge factorId={mfa.data.factorId} />
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="Activá la verificación en dos pasos"
            description="La administración solo se usa con un código de tu teléfono además de la contraseña. Activala en Perfil y volvé."
            action={
              <Link href="/perfil" asChild>
                <Button label="Ir a Perfil" />
              </Link>
            }
          />
        )}
      </Screen>
    );
  }
  return (
    <AppShell items={adminNav(permissions)}>
      <Slot />
    </AppShell>
  );
}

export default function AdminLayout() {
  return (
    <RequireSession>
      <AdminShell />
    </RequireSession>
  );
}
