import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { Brote } from '@/features/brote/Brote';
import { Button, makeStyles, Screen, Text } from '@/ui';

const useStyles = makeStyles((t) => ({
  container: {
    alignItems: 'center',
    gap: t.space.lg,
    paddingVertical: t.space.xxl,
  },
}));

/** Página propia para direcciones que no existen (en vez de "Unmatched Route"). */
export default function NotFoundScreen() {
  const styles = useStyles();
  const signedIn = useAuth().status === 'signedIn';
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Página no encontrada' }} />
      <View style={styles.container}>
        <Brote mood="pensando" />
        <Text variant="heading" role="heading" center>
          No encontramos esta página
        </Text>
        <Link href={signedIn ? '/hoy' : '/'} replace asChild>
          <Button label={signedIn ? 'Ir a mi espacio' : 'Ir al inicio'} />
        </Link>
      </View>
    </Screen>
  );
}
