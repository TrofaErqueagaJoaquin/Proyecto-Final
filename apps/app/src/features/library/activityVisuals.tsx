import {
  Compass,
  Footprints,
  Hand,
  Heart,
  House,
  Leaf,
  MessageCircle,
  Palette,
  Puzzle,
  Sofa,
  Trees,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/ui';
import type { Palette as ThemePalette } from '@/ui/tokens';

type Tone = 'primary' | 'info' | 'caution' | 'success' | 'accent';

/** Ícono y tono de cada tipo de actividad (`activity_categories.code`). */
const CATEGORY_VISUALS: Record<string, { icon: LucideIcon; tone: Tone }> = {
  movimiento: { icon: Footprints, tone: 'success' },
  calma: { icon: Leaf, tone: 'info' },
  lenguaje: { icon: MessageCircle, tone: 'primary' },
  vinculo: { icon: Heart, tone: 'accent' },
  exploracion: { icon: Compass, tone: 'caution' },
  juego_social: { icon: Users, tone: 'primary' },
  autonomia: { icon: Hand, tone: 'success' },
  creatividad: { icon: Palette, tone: 'accent' },
};

export const SPACE_ICONS: Record<string, LucideIcon> = {
  small_indoor: Sofa,
  indoor: House,
  outdoor: Trees,
};

function toneColors(colors: ThemePalette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'info':
      return { fg: colors.info, bg: colors.infoSoft };
    case 'caution':
      return { fg: colors.caution, bg: colors.cautionSoft };
    case 'success':
      return { fg: colors.success, bg: colors.successSoft };
    case 'accent':
      return { fg: colors.accent, bg: colors.surfaceSunken };
    default:
      return { fg: colors.primary, bg: colors.primarySoft };
  }
}

/** Ícono redondo del tipo principal de la actividad (el primero de sus categorías). */
export function ActivityIcon({ categories, size = 48 }: { categories: string[]; size?: number }) {
  const { colors } = useTheme();
  const visual = CATEGORY_VISUALS[categories[0] ?? ''] ?? { icon: Puzzle, tone: 'primary' };
  const { fg, bg } = toneColors(colors, visual.tone);
  const Icon = visual.icon;
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon color={fg} size={Math.round(size * 0.5)} />
    </View>
  );
}
