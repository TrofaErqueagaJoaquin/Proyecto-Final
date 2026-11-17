import { Link, Stack, usePathname } from 'expo-router';
import { View } from 'react-native';

import { ScreenHeader } from '@/features/shell/ScreenHeader';
import { Logo, makeStyles, useTheme } from '@/ui';

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
}));

/**
 * Pantallas de acceso (ingresar, registrarse, recuperar...): "Volver" y el logo llevan a la
 * portada, así quien entró por error siempre tiene una salida. En la bienvenida no hay "Volver":
 * ya hay sesión y la salida es otra.
 */
export default function AuthLayout() {
  const styles = useStyles();
  const theme = useTheme();
  const pathname = usePathname();
  return (
    <View style={styles.root}>
      <ScreenHeader
        bar
        back={pathname === '/bienvenida' ? null : '/'}
        start={
          <Link href="/" accessibilityLabel="Ir al inicio">
            <Logo />
          </Link>
        }
      />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}
      />
    </View>
  );
}
