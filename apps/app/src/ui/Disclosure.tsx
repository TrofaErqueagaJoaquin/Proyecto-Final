import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { minTouchTarget } from './tokens';

const useStyles = makeStyles((t) => ({
  box: {
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    minHeight: minTouchTarget + 8,
    paddingHorizontal: t.space.lg,
  },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.lg, gap: t.space.md },
}));

/** Sección plegada: muestra solo el título y se abre al tocarla ("Más información", "Fuentes"). */
export function Disclosure({
  title,
  children,
  initiallyOpen = false,
}: {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.box}>
      <Pressable
        style={styles.header}
        onPress={() => {
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text variant="subheading" style={{ flex: 1 }}>
          {title}
        </Text>
        <Icon color={colors.inkMuted} size={24} aria-hidden />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}
