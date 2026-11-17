import { Redirect, Slot, usePathname } from 'expo-router';
import {
  BriefcaseMedical,
  CircleUserRound,
  IdCard,
  Inbox,
  UserRoundPlus,
} from 'lucide-react-native';

import { RequireSession } from '@/features/auth/RequireSession';
import { SpaceExits } from '@/features/auth/signOut';
import { useMyProfessionalProfile, useProCases } from '@/features/professionals/queries';
import { AppShell, type NavItem } from '@/features/shell/AppShell';
import { ErrorState, LoadingScreen, Screen } from '@/ui';

/** "Mi cuenta" siempre está: es la salida a Perfil (cambiar de espacio, cerrar sesión). */
const ACCOUNT_ITEM: NavItem = { href: '/perfil', label: 'Mi cuenta', icon: CircleUserRound };

// Espacio profesional (UX_AND_NAVIGATION.md §4.1): Casos · Solicitudes · Mi ficha · Mi cuenta.
// Requiere un perfil profesional; sin él, solo se puede crear el perfil o ir a la cuenta.
function proNav(hasProfile: boolean, pending: number): NavItem[] {
  if (!hasProfile) {
    return [
      { href: '/profesional/perfil', label: 'Crear perfil', icon: UserRoundPlus },
      ACCOUNT_ITEM,
    ];
  }
  return [
    { href: '/profesional', label: 'Casos', icon: BriefcaseMedical, exact: true },
    {
      href: '/profesional/solicitudes',
      label: pending > 0 ? `Solicitudes (${String(pending)})` : 'Solicitudes',
      icon: Inbox,
    },
    { href: '/profesional/perfil', label: 'Mi ficha', icon: IdCard },
    ACCOUNT_ITEM,
  ];
}

function ProShell() {
  const pathname = usePathname();
  const profile = useMyProfessionalProfile();
  const cases = useProCases();

  if (profile.isPending) return <LoadingScreen lines={2} />;
  if (profile.isError) {
    return (
      <Screen>
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
        <SpaceExits />
      </Screen>
    );
  }
  if (!profile.data && pathname !== '/profesional/perfil') {
    return <Redirect href="/profesional/perfil" />;
  }
  const pending = (cases.data ?? []).filter((c) => c.status === 'requested').length;
  return (
    <AppShell items={proNav(Boolean(profile.data), pending)}>
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
