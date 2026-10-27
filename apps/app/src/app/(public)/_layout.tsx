import { Link, Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { BackButton } from '@/features/shell/BackButton';
import { publicFallback } from '@/features/shell/backTargets';
import { Button, Logo, makeStyles } from '@/ui';

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  start: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs, flexShrink: 1 },
  content: { flex: 1 },
}));

export default function PublicLayout() {
  const styles = useStyles();
  const auth = useAuth();
  const pathname = usePathname();
  const signedIn = auth.status === 'signedIn';
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <View style={styles.start}>
          {pathname === '/' ? null : <BackButton fallback={publicFallback(pathname)} />}
          {/* Con sesión, el logo lleva al espacio de la familia, no a la portada de bienvenida. */}
          <Link
            href={signedIn ? '/hoy' : '/'}
            accessibilityLabel={signedIn ? 'Ir a mi espacio' : 'Ir al inicio'}
          >
            <Logo />
          </Link>
        </View>
        {signedIn ? (
          <Link href={'/hoy'} asChild>
            <Button label="Mi espacio" />
          </Link>
        ) : (
          <Link href={'/ingresar'} asChild>
            <Button label="Ingresar" variant="secondary" />
          </Link>
        )}
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}
