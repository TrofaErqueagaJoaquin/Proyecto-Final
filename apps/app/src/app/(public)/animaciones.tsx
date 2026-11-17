import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { ActivityScene, SCENES } from '@/features/animations';
import { GENERIC } from '@/features/animations/generic';
import { publicEnv } from '@/lib/env';
import { Screen, Text } from '@/ui';

/** Nombre para las escenas por tipo de actividad (nunca la clave interna). */
const TYPE_LABELS: Record<string, string> = {
  movimiento: 'Movimiento',
  calma: 'Calma',
  lenguaje: 'Lenguaje',
  vinculo: 'Vínculo',
  exploracion: 'Exploración',
  juego_social: 'Juego con otros',
  autonomia: 'Autonomía',
  creatividad: 'Creatividad',
};

/** "avioncito-en-casa" → "Avioncito en casa". */
function titleFromSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Galería de las guías animadas, para revisarlas y mostrarlas en la expo. No existe en
 * producción: ahí lleva a la portada (en la demo y en desarrollo sigue en `/animaciones`).
 */
export default function AnimationsScreen() {
  if (publicEnv.EXPO_PUBLIC_APP_ENV === 'prod') return <Redirect href="/" />;

  const all = [
    ...Object.entries(SCENES).map(([slug, scene]) => ({
      key: slug,
      label: titleFromSlug(slug),
      scene,
    })),
    ...Object.entries(GENERIC).map(([code, scene]) => ({
      key: `tipo-${code}`,
      label: `Tipo: ${TYPE_LABELS[code] ?? titleFromSlug(code)}`,
      scene,
    })),
  ];
  return (
    <Screen edges={['bottom']} maxWidth={1100}>
      <Text variant="title">Guías animadas</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {all.map(({ key, label, scene }) => (
          <View key={key} style={{ gap: 6, width: 240 }}>
            <ActivityScene scene={scene} width={240} playing label={label} />
            <Text variant="small">{label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
