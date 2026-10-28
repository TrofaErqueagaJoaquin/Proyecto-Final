import { FlaskConical } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { publicEnv } from '@/lib/env';
import { Text, useTheme } from '@/ui';

/** Banner fijo del entorno demo (ARCHITECTURE.md §8): en todas las pantallas, sin forma de cerrarlo. */
export function DemoBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (publicEnv.EXPO_PUBLIC_APP_ENV !== 'demo') return null;
  return (
    <View
      role="status"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: insets.top + 4,
        paddingBottom: 4,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <FlaskConical size={14} color={colors.inkMuted} aria-hidden />
      <Text variant="caption" tone="muted">
        Entorno de demostración · datos ficticios
      </Text>
    </View>
  );
}
