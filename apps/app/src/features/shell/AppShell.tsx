import { Link, usePathname } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo, makeStyles, Text, useTheme } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

import { BackButton } from './BackButton';
import { familyFallback } from './backTargets';

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
  content: { flex: 1 },
  backBar: {
    paddingHorizontal: t.space.sm,
    paddingTop: t.space.xs,
    alignItems: 'flex-start',
  },
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

function isActive(pathname: string, { href, exact }: NavItem, items: NavItem[]): boolean {
  if (pathname === href) return true;
  if (exact === true || !pathname.startsWith(`${href}/`)) return false;
  // Si otra sección más específica coincide, esa es la activa.
  return !items.some((other) => other.href.length > href.length && pathname.startsWith(other.href));
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
  // Las pantallas internas (un integrante, un resultado...) tienen "Volver"; las secciones no.
  // Lo que no está en la navegación visible (en el teléfono, las secciones solo de escritorio)
  // es una pantalla interna y lleva "Volver".
  const back = familyFallback(
    pathname,
    items.filter((item) => wide || item.wideOnly !== true).map((item) => item.href),
  );
  const content = (
    <View style={styles.content}>
      {back === null ? null : (
        <View style={styles.backBar}>
          <BackButton fallback={back} />
        </View>
      )}
      {children}
    </View>
  );

  if (wide) {
    return (
      <View style={[styles.root, styles.wide]}>
        <View style={styles.sidebar} role="navigation" accessibilityLabel="Navegación principal">
          <Link href="/hoy" accessibilityLabel="Ir a Hoy">
            <Logo />
          </Link>
          <View style={styles.sideNav}>
            {items.map((item) => {
              const { href, label, icon: Icon } = item;
              const active = isActive(pathname, item, items);
              return (
                <Link key={href} href={href} asChild>
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
              const active = isActive(pathname, item, items);
              return (
                <Link key={href} href={href} asChild>
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
