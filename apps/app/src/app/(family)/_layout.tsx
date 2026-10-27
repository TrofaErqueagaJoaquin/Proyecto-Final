import { Slot } from 'expo-router';
import {
  ClipboardList,
  HeartHandshake,
  House,
  Puzzle,
  UserRound,
  Users,
} from 'lucide-react-native';

import { RequireSession } from '@/features/auth/RequireSession';
import { canManage, useActiveFamily } from '@/features/families/queries';
import { AppShell, type NavItem } from '@/features/shell/AppShell';

// Se agregan secciones a medida que se implementan (UX_AND_NAVIGATION.md §4.1).
// Lo que un rol no puede usar no aparece (la caregiver no ve evaluaciones).
function familyNav(manage: boolean): NavItem[] {
  return [
    { href: '/hoy', label: 'Hoy', icon: House },
    { href: '/familia', label: 'Familia', icon: Users },
    { href: '/mis-actividades', label: 'Actividades', icon: Puzzle },
    ...(manage
      ? [
          { href: '/evaluaciones', label: 'Evaluaciones', icon: ClipboardList },
          // En el teléfono se llega desde Familia (no entra una sexta pestaña).
          { href: '/profesionales', label: 'Profesionales', icon: HeartHandshake, wideOnly: true },
        ]
      : []),
    { href: '/perfil', label: 'Perfil', icon: UserRound },
  ];
}

function FamilyShell() {
  const { family } = useActiveFamily();
  return (
    <AppShell items={familyNav(canManage(family?.role))}>
      <Slot />
    </AppShell>
  );
}

export default function FamilyLayout() {
  return (
    <RequireSession>
      <FamilyShell />
    </RequireSession>
  );
}
