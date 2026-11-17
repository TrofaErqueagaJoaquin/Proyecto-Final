import { AGE_STAGES } from '@crecer/shared';
import { Link, router, useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  LifeBuoy,
  Puzzle,
  Shield,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { TextLink } from '@/features/auth/components';
import { withNext } from '@/features/auth/pendingInvitation';
import { Brote } from '@/features/brote/Brote';
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
  { icon: BookOpen, title: 'Con fuentes' },
  { icon: Puzzle, title: 'Ideas para hoy' },
  { icon: Shield, title: 'Sin publicidad' },
];

/** Quien se suma como profesional crea la cuenta y sigue directo a su perfil. */
const PROFESSIONAL_SIGN_UP = withNext('/registrarse', '/profesional/perfil');

const useStyles = makeStyles((t) => ({
  hero: { gap: t.space.lg, paddingVertical: t.space.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  headline: { flex: 1, gap: t.space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space.md },
  section: { gap: t.space.md },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
  },
}));

/** Portada pública: entrada por edad a la biblioteca (UX_AND_NAVIGATION.md §5.1). */
export default function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const signedIn = useAuth().status === 'signedIn';
  const { salida } = useLocalSearchParams<{ salida?: string }>();
  // El aviso de salida se muestra una vez y se saca `?salida=1` de la dirección (al recargar no vuelve).
  const [bye, setBye] = useState(salida === '1');
  if (salida === '1' && !bye) setBye(true);
  useEffect(() => {
    if (salida === '1') router.setParams({ salida: undefined });
  }, [salida]);
  const stageWidth = useColumnWidth(MAX_WIDTH, { phone: 2, tablet: 3, desktop: 5 });
  const sectionWidth = useColumnWidth(MAX_WIDTH, { phone: 2, tablet: 4, desktop: 4 });
  return (
    <Screen maxWidth={MAX_WIDTH} edges={['bottom']}>
      {bye && !signedIn ? <Banner tone="success">Cerraste sesión. ¡Hasta pronto!</Banner> : null}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Brote mood="hola" size={80} />
          <View style={styles.headline}>
            <Text variant="display">Ideas para crecer en casa</Text>
            <Text variant="subheading" tone="muted">
              Según la edad de tu hijo. Gratis y con fuentes.
            </Text>
          </View>
        </View>
        {/* "Ingresar" ya está en la barra: acá, una sola acción. */}
        <View style={styles.actions}>
          {signedIn ? (
            <Link href={'/hoy'} asChild>
              <Button label="Ir a mi espacio" />
            </Link>
          ) : (
            <Link href={'/registrarse'} asChild>
              <Button label="Crear una cuenta gratis" />
            </Link>
          )}
        </View>
        <View style={styles.values}>
          {VALUES.map(({ icon: Icon, title }) => (
            <View key={title} style={styles.value}>
              <Icon color={colors.accent} size={20} aria-hidden />
              <Text variant="small">{title}</Text>
            </View>
          ))}
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
      {signedIn ? null : (
        <TextLink standalone href={PROFESSIONAL_SIGN_UP}>
          ¿Sos profesional? Sumate al directorio
        </TextLink>
      )}
      <Text variant="small" tone="muted">
        Crecer en Casa orienta: no diagnostica ni reemplaza la consulta con profesionales de la
        salud.
      </Text>
    </Screen>
  );
}
