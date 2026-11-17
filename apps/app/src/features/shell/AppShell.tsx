import { Link, router, usePathname, type Href } from 'expo-router';
import {
  BriefcaseMedical,
  Check,
  ChevronDown,
  CircleUserRound,
  House,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMe } from '@/features/auth/queries';
import { SignOutButton } from '@/features/auth/signOut';
import { confirmLeave, hasUnsavedChanges } from '@/features/forms/useUnsavedGuard';
import { useMyProfessionalProfile } from '@/features/professionals/queries';
import { Button, Logo, makeStyles, Sheet, Text, useTheme } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

import { activeHref, spaceFallback } from './backTargets';
import { ScreenHeader } from './ScreenHeader';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Activo solo en esa ruta exacta (la raíz de un espacio no marca a sus hermanas). */
  exact?: boolean;
  /** Solo en la barra lateral: en el teléfono no entra una sexta pestaña. */
  wideOnly?: boolean;
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  wide: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 248,
    paddingVertical: t.space.xl,
    paddingHorizontal: t.space.lg,
    gap: t.space.xl,
    backgroundColor: t.colors.surface,
    borderRightWidth: 1,
    borderRightColor: t.colors.border,
  },
  sideNav: { gap: t.space.xs },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: minTouchTarget,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.sm,
  },
  sideItemActive: { backgroundColor: t.colors.primarySoft },
  spaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    minHeight: minTouchTarget,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.sm,
    borderWidth: 1.5,
    borderColor: t.colors.border,
  },
  spaceButtonPressed: { backgroundColor: t.colors.primarySoft },
  spaceText: { flex: 1 },
  menu: { gap: t.space.sm },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: minTouchTarget + 12,
    paddingVertical: t.space.xs,
  },
}));

type SpaceName = 'Familia' | 'Profesional' | 'Administración';

/** En qué espacio se está, según la ruta. */
export function spaceOf(pathname: string): SpaceName {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'Administración';
  if (pathname === '/profesional' || pathname.startsWith('/profesional/')) return 'Profesional';
  return 'Familia';
}

/**
 * Si hay un formulario a medio cargar, el enlace no navega solo: primero pregunta
 * "¿Salir sin guardar?" y, si eligen "Salir", va.
 */
function guardedPress(href: Href) {
  return (event: { preventDefault: () => void }) => {
    if (!hasUnsavedChanges()) return;
    event.preventDefault();
    confirmLeave(() => {
      router.push(href);
    });
  };
}

/**
 * Contenido del menú de espacios. Se monta solo al abrirlo: así las consultas (cuenta y perfil
 * profesional) no se hacen en cada pantalla. Cambiar de espacio es solo navegación.
 */
function SpaceMenu({ current, onDone }: { current: SpaceName; onDone: () => void }) {
  const styles = useStyles();
  const me = useMe();
  const professional = useMyProfessionalProfile();
  const spaces: { href: Href; label: SpaceName; icon: LucideIcon }[] = [];
  if ((me.data?.families.length ?? 0) > 0 || current === 'Familia') {
    spaces.push({ href: '/hoy', label: 'Familia', icon: House });
  }
  if (professional.data || current === 'Profesional') {
    spaces.push({ href: '/profesional', label: 'Profesional', icon: BriefcaseMedical });
  }
  if ((me.data?.permissions.length ?? 0) > 0 || current === 'Administración') {
    spaces.push({ href: '/admin', label: 'Administración', icon: ShieldCheck });
  }
  const go = (href: Href) => {
    onDone();
    confirmLeave(() => {
      router.push(href);
    });
  };
  return (
    <View style={styles.menu} role="navigation" accessibilityLabel="Cambiar de espacio">
      {spaces.map((space) => {
        const here = space.label === current;
        return (
          <Button
            key={space.label}
            label={here ? `${space.label} (estás acá)` : space.label}
            icon={here ? Check : space.icon}
            variant={here ? 'primary' : 'secondary'}
            fullWidth
            onPress={() => {
              if (here) onDone();
              else go(space.href);
            }}
          />
        );
      })}
      <Button
        label="Mi cuenta"
        icon={CircleUserRound}
        variant="ghost"
        fullWidth
        onPress={() => {
          go('/perfil');
        }}
      />
      <SignOutButton />
    </View>
  );
}

/**
 * Navegación del espacio: barra lateral desde 1024 px, pestañas inferiores en el teléfono
 * (UX_AND_NAVIGATION.md §3). Mismas rutas en todas las plataformas.
 */
export function AppShell({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const styles = useStyles();
  const theme = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const wide = width >= theme.breakpoints.desktop;
  // Las pantallas internas (un integrante, un resultado...) tienen "Volver"; la raíz del espacio
  // y las secciones visibles no. El encabezado envuelve el área segura de arriba.
  const back = spaceFallback(pathname, items, wide);
  const current = activeHref(pathname, items, wide);
  // El logo lleva al inicio del espacio en el que se está (no siempre a /hoy).
  const home = items[0];
  const space = spaceOf(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const content = (
    <View style={styles.content}>
      {back === null ? null : <ScreenHeader back={back} />}
      {children}
    </View>
  );

  if (wide) {
    return (
      <View style={[styles.root, styles.wide]}>
        <View style={styles.sidebar} role="navigation" accessibilityLabel="Navegación principal">
          {home ? (
            <Link
              href={home.href}
              accessibilityLabel={`Ir a ${home.label}`}
              onPress={guardedPress(home.href)}
            >
              <Logo />
            </Link>
          ) : (
            <Logo />
          )}
          {/* En qué espacio se está; al tocarlo, los otros espacios y "Cerrar sesión". */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Espacio: ${space}. Cambiar de espacio o cerrar sesión`}
            onPress={() => {
              setMenuOpen(true);
            }}
            style={({ pressed }) => [styles.spaceButton, pressed && styles.spaceButtonPressed]}
          >
            <Text tone="muted" style={styles.spaceText}>
              {'Espacio: '}
              <Text variant="bodyStrong">{space}</Text>
            </Text>
            <ChevronDown color={theme.colors.inkMuted} size={20} aria-hidden />
          </Pressable>
          <Sheet
            visible={menuOpen}
            onClose={() => {
              setMenuOpen(false);
            }}
            title="Cambiar de espacio"
          >
            {menuOpen ? (
              <SpaceMenu
                current={space}
                onDone={() => {
                  setMenuOpen(false);
                }}
              />
            ) : null}
          </Sheet>
          <View style={styles.sideNav}>
            {items.map((item) => {
              const { href, label, icon: Icon } = item;
              const active = item.href === current;
              return (
                <Link key={href} href={href} asChild onPress={guardedPress(href)}>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityState={{ selected: active }}
                    aria-current={active ? 'page' : undefined}
                    // Link asChild (Slot) no acepta arreglos de estilos.
                    style={StyleSheet.flatten([styles.sideItem, active && styles.sideItemActive])}
                  >
                    <Icon
                      color={active ? theme.colors.primary : theme.colors.inkMuted}
                      size={22}
                      aria-hidden
                    />
                    <Text
                      variant={active ? 'bodyStrong' : 'body'}
                      tone={active ? 'primary' : 'default'}
                    >
                      {label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>
        {content}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {content}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.tabBar} role="navigation" accessibilityLabel="Navegación principal">
          {items
            .filter((item) => item.wideOnly !== true)
            .map((item) => {
              const { href, label, icon: Icon } = item;
              const active = item.href === current;
              return (
                <Link key={href} href={href} asChild onPress={guardedPress(href)}>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                    style={styles.tab}
                  >
                    <Icon
                      color={active ? theme.colors.primary : theme.colors.inkMuted}
                      size={24}
                      aria-hidden
                    />
                    <Text variant="caption" tone={active ? 'primary' : 'muted'}>
                      {label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
        </View>
      </SafeAreaView>
    </View>
  );
}
