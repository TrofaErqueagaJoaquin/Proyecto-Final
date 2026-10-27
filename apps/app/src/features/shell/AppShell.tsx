import { Link, usePathname } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo, makeStyles, Text, useTheme } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
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

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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

  if (wide) {
    return (
      <View style={[styles.root, styles.wide]}>
        <View style={styles.sidebar} role="navigation" accessibilityLabel="Navegación principal">
          <Logo />
          <View style={styles.sideNav}>
            {items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link key={href} href={href} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityState={{ selected: active }}
                    aria-current={active ? 'page' : undefined}
                    style={[styles.sideItem, active && styles.sideItemActive]}
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
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.tabBar} role="navigation" accessibilityLabel="Navegación principal">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
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
