import { AGE_STAGES } from '@crecer/shared';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  LifeBuoy,
  Puzzle,
  Shield,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { IconGrid, IconTile, useColumnWidth } from '@/features/library/IconTile';
import { stageVisual, type Visual } from '@/features/library/libraryVisuals';
import { Banner, Button, GrowthLine, makeStyles, Screen, Text, useTheme } from '@/ui';

const MAX_WIDTH = 960;

const SECTIONS: { href: string; title: string; visual: Visual }[] = [
  { href: '/actividades', title: 'Actividades', visual: { icon: Puzzle, tone: 'primary' } },
  {
    href: '/situaciones',
    title: 'Situaciones difíciles',
    visual: { icon: LifeBuoy, tone: 'info' },
  },
  {
    href: '/cuando-consultar',
    title: 'Cuándo consultar',
    visual: { icon: Stethoscope, tone: 'success' },
  },
  { href: '/evidencia', title: 'Sobre la evidencia', visual: { icon: BookOpen, tone: 'accent' } },
];

const VALUES: { icon: LucideIcon; title: string }[] = [
  { icon: BookOpen, title: 'La evidencia a la vista' },
  { icon: Puzzle, title: 'Ideas posibles hoy' },
  { icon: Shield, title: 'Sin vigilancia ni publicidad' },
];

const useStyles = makeStyles((t) => ({
  hero: { gap: t.space.lg, paddingVertical: t.space.xl },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  section: { gap: t.space.md },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg },
  value: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
}));

/** Portada pública: entrada por edad a la biblioteca (UX_AND_NAVIGATION.md §5.1). */
export default function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const signedIn = useAuth().status === 'signedIn';
  const { salida } = useLocalSearchParams<{ salida?: string }>();
  const stageWidth = useColumnWidth(MAX_WIDTH, { phone: 2, tablet: 3, desktop: 5 });
  const sectionWidth = useColumnWidth(MAX_WIDTH, { phone: 2, tablet: 4, desktop: 4 });
  return (
    <Screen maxWidth={MAX_WIDTH} edges={['bottom']}>
      {salida === '1' && !signedIn ? (
        <Banner tone="success">Cerraste sesión. ¡Hasta pronto!</Banner>
      ) : null}
      <View style={styles.hero}>
        <Text variant="display">
          Qué necesita tu hijo a esta edad, qué podés hacer hoy y cuándo consultar.
        </Text>
        <Text variant="subheading" tone="muted">
          Pantallas, sueño, juego y movimiento. Gratis y con fuentes.
        </Text>
        <View style={styles.actions}>
          {signedIn ? (
            <Link href={'/hoy'} asChild>
              <Button label="Ir a mi espacio" />
            </Link>
          ) : (
            <>
              <Link href={'/registrarse'} asChild>
                <Button label="Crear una cuenta gratis" />
              </Link>
              <Link href={'/ingresar'} asChild>
                <Button label="Ya tengo cuenta" variant="secondary" />
              </Link>
            </>
          )}
        </View>
      </View>
      <GrowthLine />
      <View style={styles.section}>
        <Text variant="heading">¿Qué edad tiene?</Text>
        <IconGrid>
          {AGE_STAGES.map((stage) => (
            <IconTile
              key={stage.slug}
              href={`/etapas/${stage.slug}`}
              visual={stageVisual(stage.slug)}
              title={stage.label}
              width={stageWidth}
              iconSize={72}
              grow
            />
          ))}
        </IconGrid>
      </View>
      <View style={styles.section}>
        <Text variant="heading">Explorá</Text>
        <IconGrid>
          {SECTIONS.map((s) => (
            <IconTile
              key={s.href}
              href={s.href}
              visual={s.visual}
              title={s.title}
              width={sectionWidth}
            />
          ))}
        </IconGrid>
      </View>
      <View style={styles.values}>
        {VALUES.map(({ icon: Icon, title }) => (
          <View key={title} style={styles.value}>
            <Icon color={colors.accent} size={24} aria-hidden />
            <Text variant="bodyStrong">{title}</Text>
          </View>
        ))}
      </View>
      <Text variant="small" tone="muted">
        Crecer en Casa orienta: no diagnostica ni reemplaza la consulta con profesionales de la
        salud.
      </Text>
    </Screen>
  );
}
