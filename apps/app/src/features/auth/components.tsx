import { Link } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { BroteSays } from '@/features/brote/Brote';
import { Banner, Button, Card, Logo, makeStyles, Screen, Text } from '@/ui';

import { signInWithProvider, type OAuthProvider } from './oauth';

const useStyles = makeStyles((t) => ({
  header: { alignItems: 'center', gap: t.space.sm, marginBottom: t.space.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  line: { flex: 1, height: 1, backgroundColor: t.colors.border },
  oauth: { gap: t.space.sm },
  footer: { alignItems: 'center', gap: t.space.sm, marginTop: t.space.md },
}));

/** Marco común de las pantallas de acceso: logo, tarjeta centrada y pie. */
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
      <View style={styles.header}>
        <Logo />
      </View>
      {greeting ? <BroteSays size={84}>{greeting}</BroteSays> : null}
      <Card>
        <Text variant="heading">{title}</Text>
        {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
        {children}
      </Card>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

/** Enlace de texto accesible a otra ruta. */
export function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} accessibilityRole="link">
      <Text tone="primary" variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
        {children}
      </Text>
    </Link>
  );
}

/**
 * Ingreso con redes sociales. `leading`: van primero (es el camino más rápido) y el separador
 * "o con tu correo" queda debajo.
 */
export function OAuthButtons({ leading = false }: { leading?: boolean }) {
  const styles = useStyles();
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(provider: OAuthProvider) {
    setError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider);
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
        variant={leading ? 'primary' : 'secondary'}
        loading={pending === 'google'}
        disabled={pending !== null}
        onPress={() => void start('google')}
      />
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
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {leading ? divider : null}
    </View>
  );
}
