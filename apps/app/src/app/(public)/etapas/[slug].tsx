import { useLocalSearchParams } from 'expo-router';

import { ContentScreen } from '@/features/library/ContentScreen';
import { stageVisual } from '@/features/library/libraryVisuals';

/** Una etapa por edad: el ícono, el resumen y lo que más necesita; lo demás queda plegado. */
export default function StageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <ContentScreen slug={slug} collapseSections visual={stageVisual(slug)} />;
}
