import { Link, Slot } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
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
  content: { flex: 1 },
}));

export default function PublicLayout() {
  const styles = useStyles();
  const auth = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Link href="/" accessibilityLabel="Ir al inicio">
          <Logo />
        </Link>
        {auth.status === 'signedIn' ? (
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
