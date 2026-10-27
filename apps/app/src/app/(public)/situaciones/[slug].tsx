import { useLocalSearchParams } from 'expo-router';

import { ContentScreen } from '@/features/library/ContentScreen';

export default function SituationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <ContentScreen slug={slug} />;
}
