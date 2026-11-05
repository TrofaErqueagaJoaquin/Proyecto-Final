import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BroteSays } from '@/features/brote/Brote';
import { Confetti } from '@/features/chequeo/Confetti';
import { feedback } from '@/features/feedback/feedback';
import { localDate } from '@/features/plans/queries';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { makeStyles, Text, useTheme } from '@/ui';

import { badges, bestStreak, currentStreak } from './logros';

const SEEN_KEY = 'crecer.logros.vistos';

/** Días con actividades y chequeos terminados de la familia (lo que alimenta rachas y logros). */
export function useFamilyProgress(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family', familyId ?? '', 'progress'],
    enabled: familyId !== undefined,
    queryFn: async () => {
      const [logs, attempts] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('done_on')
          .eq('family_id', familyId ?? '')
          .order('done_on', { ascending: false })
          .limit(400),
        supabase
          .from('assessment_attempts')
          .select('questionnaire_versions (questionnaires (slug))')
          .eq('family_id', familyId ?? '')
          .eq('status', 'submitted'),
      ]);
      if (logs.error) throw logs.error;
      if (attempts.error) throw attempts.error;
      const days = logs.data.map((l) => l.done_on);
      const checks = new Set(
        attempts.data.flatMap((a) => {
          const slug = a.questionnaire_versions?.questionnaires?.slug;
          return slug ? [slug] : [];
        }),
      );
      return {
        activities: logs.data.length,
        doneToday: days.includes(localDate()),
        streak: currentStreak(days, localDate()),
        bestStreak: bestStreak(days),
        checks,
      };
    },
  });
}

const useStyles = makeStyles((t) => ({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    alignSelf: 'flex-start',
    paddingVertical: t.space.xs,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.sunSoft,
    borderWidth: 2,
    borderColor: t.colors.sun,
  },
  row: { gap: t.space.sm, paddingVertical: t.space.xs },
  badge: {
    width: 112,
    alignItems: 'center',
    gap: t.space.xs,
    padding: t.space.md,
    borderRadius: t.radius.lg,
    borderWidth: 2,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

/** Chip de racha para el saludo de Hoy. */
export function StreakChip({ days }: { days: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (days === 0) return null;
  return (
    <View style={styles.streak} accessibilityLabel={`Racha de ${String(days)} días`}>
      <Flame color={colors.primary} size={18} aria-hidden />
      <Text variant="label">{days === 1 ? '1 día' : `${String(days)} días seguidos`}</Text>
    </View>
  );
}

/** Logros ganados (a color) y los que faltan (en gris), con festejo cuando aparece uno nuevo. */
export function LogrosStrip({ familyId }: { familyId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const progress = useFamilyProgress(familyId);
  const [fresh, setFresh] = useState<string | null>(null);
  const list = progress.data ? badges(progress.data) : [];
  const earnedIds = list
    .filter((b) => b.earned)
    .map((b) => b.id)
    .join(',');

  // Logro nuevo (no visto en este dispositivo): festejo una sola vez.
  useEffect(() => {
    if (!earnedIds) return;
    let cancelled = false;
    void storage
      .getItem(SEEN_KEY)
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const seen = new Set((raw ?? '').split(',').filter(Boolean));
        const newOne = earnedIds.split(',').find((id) => !seen.has(id));
        if (raw !== null && newOne) {
          setFresh(newOne);
          feedback('achievement');
        }
        void storage.setItem(SEEN_KEY, earnedIds).catch(() => undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [earnedIds]);

  if (!progress.data) return null;
  const freshBadge = list.find((b) => b.id === fresh);

  return (
    <View style={{ gap: 12 }}>
      {freshBadge ? (
        <>
          <Confetti trigger={1} />
          <BroteSays mood="feliz" celebrate={1}>
            {`¡Nuevo logro: ${freshBadge.title}! ${freshBadge.description}.`}
          </BroteSays>
        </>
      ) : null}
      <Text variant="heading">Tus logros</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {list.map((badge) => {
          const Icon = badge.icon;
          return (
            <View
              key={badge.id}
              style={[
                styles.badge,
                badge.earned
                  ? { backgroundColor: colors.sunSoft, borderColor: colors.sun }
                  : {
                      backgroundColor: colors.surfaceSunken,
                      borderColor: colors.border,
                      opacity: 0.7,
                    },
              ]}
              accessibilityLabel={`${badge.title}: ${badge.description}. ${badge.earned ? 'Logrado' : 'Todavía no'}`}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: badge.earned ? colors.brand : colors.border },
                ]}
              >
                <Icon
                  color={badge.earned ? colors.onBrand : colors.inkMuted}
                  size={24}
                  aria-hidden
                />
              </View>
              <Text variant="label" center>
                {badge.title}
              </Text>
              <Text variant="caption" tone="muted" center>
                {badge.description}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
