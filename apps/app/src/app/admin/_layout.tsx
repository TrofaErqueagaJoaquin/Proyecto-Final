import { Link, Redirect, Slot, usePathname } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';

import { adminNav } from '@/features/admin/nav';
import { useIsDemo, usePermissions } from '@/features/admin/queries';
import { useMe } from '@/features/auth/queries';
import { MfaChallenge, useMfaStatus } from '@/features/auth/mfa';
import { RequireSession } from '@/features/auth/RequireSession';
import { AppShell } from '@/features/shell/AppShell';
import { Button, EmptyState, ErrorState, Screen, Skeleton } from '@/ui';

const CONTENT_PERMISSIONS = ['content.edit', 'content.review', 'content.publish'];

/**
 * Solo en la demo: quien carga contenido entra sin segundo factor, pero únicamente a Contenidos
 * (la base aplica la misma regla; ADR-036). El resto de la administración lo sigue pidiendo.
 */
function DemoContentShell({ permissions }: { permissions: Set<string> }) {
  const pathname = usePathname();
  if (!pathname.startsWith('/admin/contenidos')) return <Redirect href="/admin/contenidos" />;
  const contentOnly = new Set([...permissions].filter((p) => CONTENT_PERMISSIONS.includes(p)));
  return (
    <AppShell items={adminNav(contentOnly).filter((item) => item.href !== '/admin')}>
      <Slot />
    </AppShell>
  );
}

function AdminShell() {
  const me = useMe();
  const permissions = usePermissions();
  const mfa = useMfaStatus();
  const canEditContent = permissions.has('content.edit');
  const demo = useIsDemo(canEditContent && mfa.data?.level !== 'aal2' && !mfa.data?.factorId);

  if (me.isPending || mfa.isPending || (demo.fetchStatus === 'fetching' && demo.isPending)) {
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
  // Toda la administración exige segundo factor (las políticas de la base piden aal2), salvo
  // cargar contenido en la demo con una cuenta sin segundo factor (quien lo tiene, lo usa).
  if (mfa.data.level !== 'aal2' && !mfa.data.factorId && canEditContent && demo.data === true) {
    return <DemoContentShell permissions={permissions} />;
  }
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
