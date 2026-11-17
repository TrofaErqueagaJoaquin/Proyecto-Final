import { Link } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { BroteSays } from '@/features/brote/Brote';
import { Banner, Button, Card, makeStyles, Screen, Text } from '@/ui';

import { signInWithProvider, type OAuthProvider } from './oauth';
import { isInvitationPath } from './pendingInvitation';

/** Alto mínimo de un enlace suelto: el área táctil recomendada (48 px). */
const LINK_MIN_HEIGHT = 48;

const useStyles = makeStyles((t) => ({
  divider: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  line: { flex: 1, height: 1, backgroundColor: t.colors.border },
  oauth: { gap: t.space.sm },
  footer: { alignItems: 'center', gap: t.space.sm, marginTop: t.space.md },
  linkArea: {
    minHeight: LINK_MIN_HEIGHT,
    minWidth: LINK_MIN_HEIGHT,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.space.sm,
    borderRadius: t.radius.md,
  },
  linkPressed: { opacity: 0.7 },
  linkFocused: {
    outlineColor: t.colors.focus,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
  linkDisabled: { opacity: 0.5 },
  linkText: { textDecorationLine: 'underline', textAlign: 'center' },
}));

/**
 * Marco común de las pantallas de acceso: Brote (chico, para que el formulario quede a la vista en
 * el celular), tarjeta centrada y pie. El logo va en la barra de `app/(auth)/_layout.tsx`, así que
 * acá no se repite.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  greeting,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Lo que dice Brote arriba de la tarjeta (un saludo corto y cálido). */
  greeting?: string;
}) {
  const styles = useStyles();
  return (
    <Screen maxWidth={480}>
      {greeting ? <BroteSays size={72}>{greeting}</BroteSays> : null}
      <Card>
        <Text variant="heading">{title}</Text>
        {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
        {children}
      </Card>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

/**
 * Aviso para quien llega desde el enlace de una invitación: explica por qué tiene que entrar y que
 * después se suma a la familia. No muestra nada si `next` no es una invitación.
 */
export function InvitationNotice({ next, children }: { next: unknown; children: string }) {
  if (!isInvitationPath(next)) return null;
  return (
    <Banner tone="info" title="Te invitaron a una familia">
      {children}
    </Banner>
  );
}

/**
 * Texto subrayado que se toca, con un área de al menos 48 px de alto. Es la base de `TextLink`
 * (suelto) y de `ActionLink`.
 */
function LinkArea({
  children,
  role,
  disabled = false,
  ...rest
}: {
  children: string;
  role: 'link' | 'button';
  disabled?: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      // Primero las props externas: `Link asChild` inyecta las suyas y las propias tienen que ganar.
      {...rest}
      accessibilityRole={role}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={(state) => {
        // `focused` solo existe en web (react-native-web).
        const { focused } = state as typeof state & { focused?: boolean };
        return [
          styles.linkArea,
          state.pressed && styles.linkPressed,
          focused === true && styles.linkFocused,
          disabled && styles.linkDisabled,
        ];
      }}
    >
      <Text tone="primary" variant="bodyStrong" style={styles.linkText}>
        {children}
      </Text>
    </Pressable>
  );
}

/**
 * Enlace de texto accesible a otra ruta. Suelto (`standalone`) ocupa su propia línea con un área
 * táctil de 48 px; sin `standalone` va dentro de una oración (`<Text>… <TextLink /> …</Text>`).
 */
export function TextLink({
  href,
  children,
  standalone = false,
}: {
  href: string;
  children: string;
  standalone?: boolean;
}) {
  if (standalone) {
    return (
      <Link href={href} asChild>
        <LinkArea role="link">{children}</LinkArea>
      </Link>
    );
  }
  return (
    <Link href={href} accessibilityRole="link">
      <Text tone="primary" variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
        {children}
      </Text>
    </Link>
  );
}

/** Acción secundaria con forma de enlace (por ejemplo, "No soy yo · Cerrar sesión"). */
export function ActionLink({
  children,
  onPress,
  disabled,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <LinkArea role="button" onPress={onPress} disabled={disabled}>
      {children}
    </LinkArea>
  );
}

/**
 * Ingreso con redes sociales: Google a la vista y GitHub y Discord dentro de "Otras opciones" (no
 * le dicen nada a la mayoría de las familias). Los botones son secundarios: el principal de la
 * pantalla es el del correo. `leading`: van antes del formulario y el separador "o con tu correo"
 * queda debajo. `next`: adónde seguir después de entrar (por ejemplo, una invitación).
 */
export function OAuthButtons({ leading = false, next }: { leading?: boolean; next?: string }) {
  const styles = useStyles();
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  async function start(provider: OAuthProvider) {
    setError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider, next);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setPending(null);
    }
  }

  const divider = (
    <View style={styles.divider} aria-hidden>
      <View style={styles.line} />
      <Text variant="small" tone="muted">
        {leading ? 'o con tu correo' : 'o'}
      </Text>
      <View style={styles.line} />
    </View>
  );

  return (
    <View style={styles.oauth}>
      {leading ? null : divider}
      <Button
        label="Continuar con Google"
        variant="secondary"
        loading={pending === 'google'}
        disabled={pending !== null}
        onPress={() => void start('google')}
      />
      {more ? (
        <>
          <Button
            label="Continuar con GitHub"
            variant="secondary"
            loading={pending === 'github'}
            disabled={pending !== null}
            onPress={() => void start('github')}
          />
          <Button
            label="Continuar con Discord"
            variant="secondary"
            loading={pending === 'discord'}
            disabled={pending !== null}
            onPress={() => void start('discord')}
          />
        </>
      ) : (
        <ActionLink
          onPress={() => {
            setMore(true);
          }}
        >
          Otras opciones
        </ActionLink>
      )}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {leading ? divider : null}
    </View>
  );
}

/**
 * Espera entre reenvíos de un correo (para no chocar con el límite de envíos). `start()` arranca la
 * cuenta y `left` dice cuántos segundos faltan (0 = se puede reenviar).
 */
export function useCooldown(seconds = 60): { left: number; start: () => void } {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => {
      setLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [left]);
  const start = useCallback(() => {
    setLeft(seconds);
  }, [seconds]);
  return { left, start };
}
