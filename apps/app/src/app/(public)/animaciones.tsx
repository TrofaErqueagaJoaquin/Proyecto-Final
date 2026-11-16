import { View } from 'react-native';

import { ActivityScene, SCENES } from '@/features/animations';
import { GENERIC } from '@/features/animations/generic';
import { Screen, Text } from '@/ui';

/** Galería de las guías animadas (para revisarlas y mostrarlas en la expo). */
export default function AnimationsScreen() {
  const all = [
    ...Object.entries(SCENES).map(([slug, scene]) => ({ key: slug, scene })),
    ...Object.entries(GENERIC).map(([code, scene]) => ({ key: `tipo: ${code}`, scene })),
  ];
  return (
    <Screen maxWidth={1100}>
      <Text variant="title">Guías animadas</Text>
      <Text tone="muted">{`${String(Object.keys(SCENES).length)} actividades y ${String(Object.keys(GENERIC).length)} escenas por tipo.`}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {all.map(({ key, scene }) => (
          <View key={key} style={{ gap: 6 }}>
            <ActivityScene scene={scene} width={240} playing label={key} />
            <Text variant="small">{key}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
