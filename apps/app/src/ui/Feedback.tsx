import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, View, type ViewStyle } from 'react-native';

import { errorKind, friendlyError } from '@/copy/errors';

import { BrandMark } from './BrandMark';
import { Button } from './Button';
import { Screen } from './Layout';
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
  action: { alignItems: 'flex-start', marginTop: t.space.xs },
}));

// Qué hacer con "Ingresar de nuevo" cuando la pantalla no pasa `onSignIn`. Lo monta
// app/_layout.tsx (ui/ no puede importar expo-router ni features).
const SignInAgainContext = createContext<(() => void) | undefined>(undefined);

/** Acción por defecto de "Ingresar de nuevo" con sesión vencida (cerrar sesión e ir a ingresar). */
export function SignInAgainProvider({
  onSignIn,
  children,
}: {
  onSignIn: () => void;
  children: ReactNode;
}) {
  return <SignInAgainContext.Provider value={onSignIn}>{children}</SignInAgainContext.Provider>;
}

/** Botón de un aviso ("Reintentar", "Ingresar de nuevo"…). */
export interface FeedbackAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

/** Mensaje en contexto. Ícono + texto: nunca depende solo del color. `action` agrega un botón. */
export function Banner({
  tone = 'info',
  title,
  children,
  icon,
  action,
}: {
  tone?: BannerTone;
  title?: string;
  children?: ReactNode;
  /** Ícono propio (por ejemplo, sin conexión); si no, el del tono. */
  icon?: LucideIcon;
  action?: FeedbackAction;
}) {
  const styles = useBannerStyles();
  const { colors } = useTheme();
  const Icon = icon ?? BANNER_ICONS[tone];
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
        {action ? (
          <View style={styles.action}>
            <Button
              label={action.label}
              variant="secondary"
              loading={action.loading}
              onPress={action.onPress}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Aviso de error listo para usar: elige el texto, el ícono y el botón según el error.
 * Sin internet → "Reintentar"; sesión vencida → "Ingresar de nuevo" (`onSignIn` o el de la app).
 * Sin `error` no muestra nada.
 */
export function ErrorBanner({
  error,
  onRetry,
  onSignIn,
  retryLoading,
}: {
  error: unknown;
  onRetry?: () => void;
  onSignIn?: () => void;
  /** Muestra "Reintentar" cargando mientras se vuelve a intentar. */
  retryLoading?: boolean;
}) {
  const defaultSignIn = useContext(SignInAgainContext);
  if (error === null || error === undefined || error === false) return null;
  const kind = errorKind(error);
  const signIn = onSignIn ?? defaultSignIn;
  const action: FeedbackAction | undefined =
    kind === 'session' && signIn
      ? { label: 'Ingresar de nuevo', onPress: signIn }
      : onRetry
        ? { label: 'Reintentar', onPress: onRetry, loading: retryLoading }
        : undefined;
  return (
    <Banner
      tone={kind === 'offline' ? 'caution' : 'danger'}
      icon={kind === 'offline' ? WifiOff : undefined}
      action={action}
    >
      {friendlyError(error)}
    </Banner>
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
  actions: { alignItems: 'center', gap: t.space.sm },
  loading: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xl },
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

const DEFAULT_ERROR = 'No pudimos cargar esta información.';

export interface ErrorStateProps {
  /** El error tal cual: decide el texto y si es "sin conexión" o "sesión vencida". */
  error?: unknown;
  title?: string;
  /** Texto propio para errores comunes (sin conexión y sesión vencida usan el suyo). */
  message?: string;
  onRetry?: () => void;
  /** Con sesión vencida, el botón principal pasa a ser "Ingresar de nuevo". */
  onSignIn?: () => void;
  /** Una segunda salida, más discreta (por ejemplo, "Mi cuenta" o "Cerrar sesión"). */
  secondaryAction?: FeedbackAction;
}

/** Error de carga con un paso siguiente claro ("Reintentar") y, si hace falta, una salida. */
export function ErrorState({
  error,
  title,
  message,
  onRetry,
  onSignIn,
  secondaryAction,
}: ErrorStateProps) {
  const styles = useStateStyles();
  const defaultSignIn = useContext(SignInAgainContext);
  const signIn = onSignIn ?? defaultSignIn;
  const kind = error === undefined ? 'other' : errorKind(error);
  const text =
    kind !== 'other'
      ? friendlyError(error)
      : (message ?? (error === undefined ? undefined : friendlyError(error)) ?? DEFAULT_ERROR);
  const heading =
    title ??
    (kind === 'offline'
      ? 'Sin conexión'
      : kind === 'session'
        ? 'Tu sesión venció'
        : 'Algo salió mal');
  const primary: FeedbackAction | undefined =
    kind === 'session' && signIn
      ? { label: 'Ingresar de nuevo', onPress: signIn }
      : onRetry
        ? { label: 'Reintentar', onPress: onRetry }
        : undefined;
  return (
    <EmptyState
      icon={kind === 'offline' ? WifiOff : CircleAlert}
      title={heading}
      description={text}
      action={
        primary || secondaryAction ? (
          <View style={styles.actions}>
            {primary ? <Button label={primary.label} onPress={primary.onPress} /> : null}
            {secondaryAction ? (
              <Button
                label={secondaryAction.label}
                variant="ghost"
                loading={secondaryAction.loading}
                onPress={secondaryAction.onPress}
              />
            ) : null}
          </View>
        ) : null
      }
    />
  );
}

// ── Pantallas completas de carga y de error ─────────────────────────────

/**
 * Pantalla de carga con márgenes y área segura (nunca un bloque gris suelto).
 * `illustration` permite poner a Brote: `<LoadingScreen illustration={<Brote mood="pensando" />} />`.
 */
export function LoadingScreen({
  message,
  illustration,
  lines = 3,
}: {
  message?: string;
  illustration?: ReactNode;
  /** Cantidad de bloques de esqueleto debajo (0 para ninguno). */
  lines?: number;
}) {
  const styles = useStateStyles();
  return (
    <Screen>
      <View style={styles.loading} aria-busy accessibilityLabel={message ?? 'Cargando'}>
        {illustration ?? <BrandMark size={56} />}
        {message ? (
          <Text tone="muted" center>
            {message}
          </Text>
        ) : null}
      </View>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={i === 0 ? 28 : 96} width={i === 0 ? '60%' : '100%'} />
      ))}
    </Screen>
  );
}

/** `ErrorState` dentro de `Screen`: con márgenes y área segura. Mismas props. */
export function ErrorScreen(props: ErrorStateProps) {
  return (
    <Screen>
      <ErrorState {...props} />
    </Screen>
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
      // Marca para las pruebas y las capturas: esperar a que no quede nada cargando.
      testID="skeleton"
      style={[
        { height, width, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken, opacity },
        style,
      ]}
    />
  );
}
