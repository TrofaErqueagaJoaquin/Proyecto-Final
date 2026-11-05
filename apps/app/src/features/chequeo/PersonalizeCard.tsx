import { useRouter } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { feedback } from '@/features/feedback/feedback';
import { useMembers } from '@/features/families/queries';
import { makeStyles, Text, useTheme } from '@/ui';

import { nextTheme, QUICK_CHECK, useLatestBands } from './queries';

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    padding: t.space.xl,
    borderRadius: t.radius.lg,
    borderWidth: 2,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: t.space.xs },
  kicker: { letterSpacing: 1 },
}));

/**
 * Recomendación "en grande" de Hoy (rediseño de 2026): si falta el chequeo de 1 minuto, lo invita;
 * si ya está, propone el tema que más conviene mirar (3 preguntas) para ajustar las ideas.
 */
export function PersonalizeCard({ familyId }: { familyId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const members = useMembers(familyId);
  const member = members.data?.find((m) => m.archived_at === null);
  const latest = useLatestBands(member?.id);

  if (!member || !latest.data) return null;
  const { bands, done } = latest.data;
  const quickDone = done.has(QUICK_CHECK) || done.has('habitos');
  const theme = quickDone ? nextTheme(bands, done) : null;
  if (quickDone && !theme) return null;

  const href = theme
    ? (`/chequeo/${member.id}?tema=${theme.slug}` as const)
    : (`/chequeo/${member.id}` as const);
  const Icon = theme?.icon ?? Sparkles;
  const kicker = theme ? 'PARA CONOCERNOS MÁS · MENOS DE 1 MINUTO' : 'EMPEZÁ ACÁ · 1 MINUTO';
  const title = theme ? theme.title : `¿Cómo viene ${member.alias}?`;
  const description = theme
    ? `${theme.invite}${/[.?!]$/.test(theme.invite) ? '' : '.'} Con eso ajusto las ideas para ${member.alias}.`
    : '6 preguntas rápidas y te doy una idea a medida para hoy.';

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${title}. ${description}`}
        onPress={() => {
          feedback('tap');
          router.push(href);
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme ? colors.mintSoft : colors.sunSoft,
            borderColor: theme ? colors.mint : colors.sun,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: theme ? colors.mint : colors.sun }]}>
          <Icon color={colors.onBrand} size={32} aria-hidden />
        </View>
        <View style={styles.body}>
          <Text variant="caption" style={styles.kicker}>
            {kicker}
          </Text>
          <Text variant="heading">{title}</Text>
          <Text>{description}</Text>
        </View>
        <ChevronRight color={colors.ink} size={28} aria-hidden />
      </Pressable>
    </Animated.View>
  );
}
