import type { NavItem } from '@/features/shell/AppShell';
import {
  BadgeCheck,
  BookOpen,
  ChartColumn,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
  UserRound,
} from 'lucide-react-native';

/** Secciones visibles según los permisos (lo que un rol no puede usar no aparece). */
export function adminNav(permissions: Set<string>): NavItem[] {
  const items: (NavItem & { permission?: string | string[] })[] = [
    { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
    {
      href: '/admin/verificaciones',
      label: 'Verificaciones',
      icon: BadgeCheck,
      permission: 'professionals.verify',
      wideOnly: true,
    },
    {
      href: '/admin/usuarios',
      label: 'Usuarios',
      icon: Users,
      permission: 'users.read',
      wideOnly: true,
    },
    {
      href: '/admin/contenidos',
      label: 'Contenidos',
      icon: FileText,
      permission: 'content.edit',
      wideOnly: true,
    },
    {
      href: '/admin/conocimiento',
      label: 'Base de conocimiento',
      icon: BookOpen,
      permission: 'kb.manage',
      wideOnly: true,
    },
    {
      href: '/admin/auditoria',
      label: 'Auditoría',
      icon: ScrollText,
      permission: 'audit.read',
      wideOnly: true,
    },
    {
      href: '/admin/uso',
      label: 'Uso de la IA',
      icon: ChartColumn,
      permission: 'usage.read',
      wideOnly: true,
    },
    {
      href: '/admin/configuracion',
      label: 'Configuración',
      icon: Settings,
      permission: ['settings.manage', 'catalog.manage'],
      wideOnly: true,
    },
    { href: '/hoy', label: 'Mi espacio', icon: UserRound },
  ];
  return items
    .filter(({ permission }) =>
      permission === undefined
        ? true
        : (Array.isArray(permission) ? permission : [permission]).some((p) => permissions.has(p)),
    )
    .map(({ permission: _permission, ...item }) => item);
}
