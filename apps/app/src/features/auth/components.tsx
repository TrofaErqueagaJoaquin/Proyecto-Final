import { Link } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
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
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Screen maxWidth={480}>
      <View style={styles.header}>
        <Logo />
      </View>
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

export function OAuthButtons() {
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

  return (
    <View style={styles.oauth}>
      <View style={styles.divider} aria-hidden>
        <View style={styles.line} />
        <Text variant="small" tone="muted">
          o
        </Text>
        <View style={styles.line} />
      </View>
      <Button
        label="Continuar con Google"
        variant="secondary"
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
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </View>
  );
}
