import { useLocalSearchParams } from 'expo-router';

import { ActivityDetail } from '@/features/library/ActivityDetail';
import { useActivityFlow } from '@/features/library/ActivityFlow';
import { useActivity } from '@/features/library/queries';
import { Screen, Text } from '@/ui';

/** Página de una actividad (para enlaces directos). Es el mismo detalle que la ventana. */
export default function ActivityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const activity = useActivity(slug);
  const flow = useActivityFlow();
  return (
    <Screen edges={['bottom']}>
      {activity.data ? <Text variant="title">{activity.data.title}</Text> : null}
      <ActivityDetail slug={slug} onDone={flow.celebrate} />
    </Screen>
  );
}
