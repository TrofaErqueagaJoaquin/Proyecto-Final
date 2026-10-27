import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles, Text, useTheme } from '@/ui';

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  body: { flex: 1, gap: t.space.xs },
}));

/** Tarjeta navegable: todo el bloque es un enlace con un solo nombre accesible. */
export function LinkCard({
  href,
  title,
  description,
  footer,
  leading,
}: {
  href: string;
  title: string;
  description?: string;
  footer?: ReactNode;
  /** Ícono o imagen a la izquierda (decorativo). */
  leading?: ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={title} style={styles.card}>
        {leading}
        <View style={styles.body}>
          <Text variant="subheading">{title}</Text>
          {description ? <Text tone="muted">{description}</Text> : null}
          {footer}
        </View>
        <ChevronRight color={colors.inkMuted} size={22} aria-hidden />
      </Pressable>
    </Link>
  );
}
