import { Link, Redirect, Slot, usePathname } from 'expo-router';
import { CircleUserRound, ShieldAlert } from 'lucide-react-native';

import { adminNav } from '@/features/admin/nav';
import { useIsDemo, usePermissions } from '@/features/admin/queries';
import { useMe } from '@/features/auth/queries';
import { MfaChallenge, useMfaStatus } from '@/features/auth/mfa';
import { RequireSession } from '@/features/auth/RequireSession';
import { SpaceExits } from '@/features/auth/signOut';
import { AppShell } from '@/features/shell/AppShell';
import { Button, EmptyState, ErrorState, LoadingScreen, Screen } from '@/ui';

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
    return <LoadingScreen lines={2} />;
  }
  if (me.isError || mfa.isError) {
    const failed = me.isError ? me : mfa;
    return (
      <Screen>
        <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
        <SpaceExits />
      </Screen>
    );
  }
  if (permissions.size === 0) {
    return (
      <Screen>
        <EmptyState icon={ShieldAlert} title="No tenés acceso a esta sección" />
        <SpaceExits />
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
          <>
            <EmptyState
              icon={ShieldAlert}
              title="Activá la verificación en dos pasos"
              description="La administración pide un código de tu teléfono además de la contraseña. Activala en Mi cuenta, en Opciones avanzadas."
              action={
                <Link href="/perfil" asChild>
                  <Button label="Ir a Mi cuenta" icon={CircleUserRound} />
                </Link>
              }
            />
            <SpaceExits account={false} />
          </>
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
