import { AGE_STAGES } from '@crecer/shared';
import { Link } from 'expo-router';
import { BookOpen, Puzzle, Shield, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { LinkCard } from '@/features/library/LinkCard';
import { Button, Card, GrowthLine, makeStyles, Screen, Text, useTheme } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

const VALUES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: BookOpen,
    title: 'La evidencia a la vista',
    text: 'Cada recomendación dice de dónde sale: guía oficial, estudio o propuesta del proyecto.',
  },
  {
    icon: Puzzle,
    title: 'Ideas posibles hoy',
    text: 'Actividades con poco tiempo, sin materiales y en espacios chicos.',
  },
  {
    icon: Shield,
    title: 'Sin vigilancia ni publicidad',
    text: 'Pedimos lo mínimo y vos decidís qué compartir y con quién.',
  },
];

const useStyles = makeStyles((t) => ({
  hero: { gap: t.space.lg, paddingVertical: t.space.xl },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg },
  value: { flexGrow: 1, flexBasis: 240 },
  stages: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  stage: {
    minHeight: minTouchTarget + 8,
    paddingHorizontal: t.space.xl,
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primarySoft,
  },
  sections: { gap: t.space.md },
}));

/** Portada pública: entrada por edad a la biblioteca (UX_AND_NAVIGATION.md §5.1). */
export default function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Screen maxWidth={960} edges={['bottom']}>
      <View style={styles.hero}>
        <Text variant="display">
          Qué necesita tu hijo a esta edad, qué podés hacer hoy y cuándo consultar.
        </Text>
        <Text variant="subheading" tone="muted">
          Orientación para familias sobre pantallas, sueño, juego y movimiento. Gratis y con
          fuentes.
        </Text>
        <View style={styles.actions}>
          <Link href={'/registrarse'} asChild>
            <Button label="Crear una cuenta gratis" />
          </Link>
          <Link href={'/ingresar'} asChild>
            <Button label="Ya tengo cuenta" variant="secondary" />
          </Link>
        </View>
      </View>
      <GrowthLine />
      <Card>
        <Text variant="heading">¿Qué edad tiene?</Text>
        <View style={styles.stages}>
          {AGE_STAGES.map((stage) => (
            <Link key={stage.slug} href={`/etapas/${stage.slug}`} asChild>
              <Pressable accessibilityRole="link" style={styles.stage}>
                <Text variant="bodyStrong" tone="primary">
                  {stage.label}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </Card>
      <View style={styles.sections}>
        <LinkCard
          href="/actividades"
          title="Actividades"
          description="Ideas con poco tiempo, sin materiales y en espacios chicos, con filtros por edad."
        />
        <LinkCard
          href="/situaciones"
          title="Situaciones difíciles"
          description="Qué hacer si se enoja al apagar, si necesita la pantalla para calmarse y más."
        />
        <LinkCard
          href="/cuando-consultar"
          title="Cuándo consultar"
          description="Señales orientativas para pedir ayuda profesional."
        />
        <LinkCard
          href="/evidencia"
          title="Sobre la evidencia"
          description="Cómo leemos los estudios y la bibliografía completa."
        />
      </View>
      <View style={styles.grid}>
        {VALUES.map(({ icon: Icon, title, text }) => (
          <Card key={title} style={styles.value}>
            <Icon color={colors.accent} size={28} aria-hidden />
            <Text variant="subheading">{title}</Text>
            <Text tone="muted">{text}</Text>
          </Card>
        ))}
      </View>
      <Text variant="small" tone="muted">
        Crecer en Casa orienta: no diagnostica ni reemplaza la consulta con profesionales de la
        salud.
      </Text>
    </Screen>
  );
}
