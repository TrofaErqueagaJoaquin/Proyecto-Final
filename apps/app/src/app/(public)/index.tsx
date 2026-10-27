import { Link } from 'expo-router';
import { BookOpen, Puzzle, Shield, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Card, GrowthLine, makeStyles, Screen, Text, useTheme } from '@/ui';

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
}));

/** Portada pública. La biblioteca por edades se suma en la Fase 5. */
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
