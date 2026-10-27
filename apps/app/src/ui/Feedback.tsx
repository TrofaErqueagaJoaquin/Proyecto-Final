import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, View, type ViewStyle } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

// ── Banner ──────────────────────────────────────────────────────────────

export type BannerTone = 'info' | 'caution' | 'danger' | 'success';

const BANNER_ICONS: Record<BannerTone, LucideIcon> = {
  info: Info,
  caution: TriangleAlert,
  danger: CircleAlert,
  success: CircleCheck,
};

const useBannerStyles = makeStyles((t) => ({
  banner: {
    flexDirection: 'row',
    gap: t.space.md,
    padding: t.space.lg,
    borderRadius: t.radius.md,
    borderLeftWidth: 4,
  },
  info: { backgroundColor: t.colors.infoSoft, borderLeftColor: t.colors.info },
  caution: { backgroundColor: t.colors.cautionSoft, borderLeftColor: t.colors.caution },
  danger: { backgroundColor: t.colors.dangerSoft, borderLeftColor: t.colors.danger },
  success: { backgroundColor: t.colors.successSoft, borderLeftColor: t.colors.success },
  body: { flex: 1, gap: t.space.xs },
}));

/** Mensaje en contexto. Ícono + texto: nunca depende solo del color. */
export function Banner({
  tone = 'info',
  title,
  children,
}: {
  tone?: BannerTone;
  title?: string;
  children?: ReactNode;
}) {
  const styles = useBannerStyles();
  const { colors } = useTheme();
  const Icon = BANNER_ICONS[tone];
  return (
    <View
      style={[styles.banner, styles[tone]]}
      role={tone === 'danger' ? 'alert' : 'status'}
      accessibilityLiveRegion="polite"
    >
      <Icon color={colors[tone]} size={22} aria-hidden />
      <View style={styles.body}>
        {title ? <Text variant="bodyStrong">{title}</Text> : null}
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </View>
    </View>
  );
}

// ── EmptyState y ErrorState ─────────────────────────────────────────────

const useStateStyles = makeStyles((t) => ({
  container: {
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.xxl,
    paddingHorizontal: t.space.xl,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { maxWidth: 420, gap: t.space.sm },
}));

/** Estado vacío con UNA acción clara (UX_AND_NAVIGATION.md §6). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const styles = useStateStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Icon color={colors.primary} size={30} aria-hidden />
      </View>
      <View style={styles.text}>
        <Text variant="subheading" center>
          {title}
        </Text>
        {description ? (
          <Text tone="muted" center>
            {description}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function ErrorState({
  message = 'No pudimos cargar esta información.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={CircleAlert}
      title="Algo salió mal"
      description={message}
      action={onRetry ? <Button label="Reintentar" variant="secondary" onPress={onRetry} /> : null}
    />
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────

// En web no existe el driver nativo de animaciones.
const NATIVE_DRIVER = Platform.OS !== 'web';

/** Bloque de carga con la forma del contenido. Respeta "reducir movimiento". */
export function Skeleton({
  height = 16,
  width = '100%',
  style,
}: {
  height?: number;
  width?: ViewStyle['width'];
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (reduced || cancelled) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: NATIVE_DRIVER }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 700,
              useNativeDriver: NATIVE_DRIVER,
            }),
          ]),
        );
        loop.start();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      aria-hidden
      style={[
        { height, width, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken, opacity },
        style,
      ]}
    />
  );
}
