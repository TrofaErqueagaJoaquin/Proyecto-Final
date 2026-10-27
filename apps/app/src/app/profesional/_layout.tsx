import { Redirect, Slot, usePathname } from 'expo-router';
import { BriefcaseMedical, Inbox, UserRound, Users } from 'lucide-react-native';

import { RequireSession } from '@/features/auth/RequireSession';
import { useMyProfessionalProfile, useProCases } from '@/features/professionals/queries';
import { AppShell, type NavItem } from '@/features/shell/AppShell';
import { ErrorState, Screen, Skeleton } from '@/ui';

// Espacio profesional (UX_AND_NAVIGATION.md §4.1): Casos · Solicitudes · Perfil.
// Requiere un perfil profesional; sin él, solo se puede crear el perfil.
function proNav(pending: number): NavItem[] {
  return [
    { href: '/profesional', label: 'Casos', icon: BriefcaseMedical, exact: true },
    {
      href: '/profesional/solicitudes',
      label: pending > 0 ? `Solicitudes (${String(pending)})` : 'Solicitudes',
      icon: Inbox,
    },
    { href: '/profesional/perfil', label: 'Mi perfil', icon: UserRound },
    { href: '/hoy', label: 'Mi familia', icon: Users },
  ];
}

function ProShell() {
  const pathname = usePathname();
  const profile = useMyProfessionalProfile();
  const cases = useProCases();

  if (profile.isPending) {
    return (
      <Screen>
        <Skeleton height={32} width="50%" />
        <Skeleton height={160} />
      </Screen>
    );
  }
  if (profile.isError) return <ErrorState onRetry={() => void profile.refetch()} />;
  if (!profile.data && pathname !== '/profesional/perfil') {
    return <Redirect href="/profesional/perfil" />;
  }
  const pending = (cases.data ?? []).filter((c) => c.status === 'requested').length;
  return (
    <AppShell items={proNav(pending)}>
      <Slot />
    </AppShell>
  );
}

export default function ProfessionalLayout() {
  return (
    <RequireSession>
      <ProShell />
    </RequireSession>
  );
}
