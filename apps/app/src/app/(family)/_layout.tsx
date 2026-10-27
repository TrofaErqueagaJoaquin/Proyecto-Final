import { Slot } from 'expo-router';
import { House, Puzzle, UserRound, Users } from 'lucide-react-native';

import { RequireSession } from '@/features/auth/RequireSession';
import { AppShell, type NavItem } from '@/features/shell/AppShell';

// Se agregan secciones a medida que se implementan (UX_AND_NAVIGATION.md §4.1).
const FAMILY_NAV: NavItem[] = [
  { href: '/hoy', label: 'Hoy', icon: House },
  { href: '/familia', label: 'Familia', icon: Users },
  { href: '/mis-actividades', label: 'Actividades', icon: Puzzle },
  { href: '/perfil', label: 'Perfil', icon: UserRound },
];

export default function FamilyLayout() {
  return (
    <RequireSession>
      <AppShell items={FAMILY_NAV}>
        <Slot />
      </AppShell>
    </RequireSession>
  );
}
