import { useLocalSearchParams } from 'expo-router';

import { ContentScreen } from '@/features/library/ContentScreen';

export default function StageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <ContentScreen slug={slug} />;
}
