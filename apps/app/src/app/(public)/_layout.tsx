import { Link, Slot, usePathname } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { publicFallback } from '@/features/shell/backTargets';
import { ScreenHeader } from '@/features/shell/ScreenHeader';
import { BrandMark, Button, Logo, makeStyles } from '@/ui';

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  content: { flex: 1 },
}));

/** Por debajo de este ancho, con flecha y botón, el logo se muestra sin el nombre. */
const COMPACT_WIDTH = 440;

export default function PublicLayout() {
  const styles = useStyles();
  const auth = useAuth();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const signedIn = auth.status === 'signedIn';
  const home = pathname === '/';
  // En el teléfono, flecha + logo completo + botón no entran en un renglón.
  const compact = !home && width < COMPACT_WIDTH;
  return (
    <View style={styles.root}>
      <ScreenHeader
        bar
        back={home ? null : publicFallback(pathname)}
        start={
          // Con sesión, el logo lleva al espacio de la familia, no a la portada de bienvenida.
          <Link
            href={signedIn ? '/hoy' : '/'}
            accessibilityLabel={signedIn ? 'Ir a mi espacio' : 'Ir al inicio'}
          >
            {compact ? <BrandMark size={36} /> : <Logo />}
          </Link>
        }
        end={
          signedIn ? (
            <Link href={'/hoy'} asChild>
              <Button label="Mi espacio" />
            </Link>
          ) : (
            <Link href={'/ingresar'} asChild>
              <Button label="Ingresar" variant="secondary" />
            </Link>
          )
        }
      />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}
