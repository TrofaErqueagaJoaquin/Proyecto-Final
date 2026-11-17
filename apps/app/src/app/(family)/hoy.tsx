import { Link, Redirect, useRouter } from 'expo-router';
import { Award, ChevronRight, Wind } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useMe } from '@/features/auth/queries';
import { BroteSays } from '@/features/brote/Brote';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { feedback } from '@/features/feedback/feedback';
import { ActivityGrid } from '@/features/library/ActivityTile';
import { useSavedActivities } from '@/features/library/queries';
import { badges } from '@/features/logros/logros';
import { LogrosStrip, StreakChip, useFamilyProgress } from '@/features/logros/LogrosStrip';
import { storage } from '@/lib/storage';
import { useMyProfessionalProfile } from '@/features/professionals/queries';
import { TodaySection } from '@/features/plans/TodaySection';
import { WelcomeBack } from '@/features/plans/WelcomeBack';
import {
  Button,
  ErrorScreen,
  LoadingScreen,
  makeStyles,
  Screen,
  Sheet,
  Text,
  useOverlayTurn,
  useTheme,
} from '@/ui';

const useStyles = makeStyles((t) => ({
  pause: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: t.colors.border,
  },
  pauseIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.mintSoft,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space.sm },
  logros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    minHeight: 48,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: t.colors.border,
  },
}));

// La misma clave que usa `LogrosStrip`: lo que se festeja acá ya no se vuelve a festejar allá.
const seenKey = (familyId: string) => `crecer.logros.vistos.${familyId}`;

/**
 * Los logros como chip ("3 logros"): al tocarlo, la tira completa en una ventana. El festejo de
 * un logro nuevo se muestra igual, aunque la tira no esté a la vista.
 */
function LogrosChip({ familyId }: { familyId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const progress = useFamilyProgress(familyId);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const list = progress.data ? badges(progress.data) : [];
  const earned = list.filter((b) => b.earned);
  const earnedIds = earned.map((b) => b.id).join(',');
  const freshBadge = list.find((b) => b.id === fresh);
  const popupVisible = useOverlayTurn('logro-hoy', freshBadge !== undefined);

  useEffect(() => {
    if (!earnedIds) return;
    let cancelled = false;
    void storage
      .getItem(seenKey(familyId))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const seen = new Set((raw ?? '').split(',').filter(Boolean));
        const newOne = earnedIds.split(',').find((id) => !seen.has(id));
        if (raw !== null && newOne) {
          setFresh(newOne);
          feedback('achievement');
        }
        void storage.setItem(seenKey(familyId), earnedIds).catch(() => undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [earnedIds, familyId]);

  if (!progress.data) return null;
  const label = earned.length === 1 ? '1 logro' : `${String(earned.length)} logros`;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tus logros: ${label}. Ver todos`}
        onPress={() => {
          feedback('tap');
          setOpen(true);
        }}
        style={({ pressed }) => [styles.logros, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Award color={colors.primary} size={20} aria-hidden />
        <Text variant="label">{label}</Text>
      </Pressable>
      <Sheet
        visible={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        <LogrosStrip familyId={familyId} />
      </Sheet>
      <GuidePopup
        visible={popupVisible}
        celebrate
        title="¡Nuevo logro!"
        message={freshBadge ? `${freshBadge.title}: ${freshBadge.description}.` : undefined}
        secondary={{
          label: '¡Genial!',
          onPress: () => {
            setFresh(null);
          },
        }}
        onClose={() => {
          setFresh(null);
        }}
      />
    </>
  );
}

function greeting(name: string | null, streak: number): string {
  const hour = new Date().getHours();
  const base = hour < 12 ? '¡Buen día' : hour < 20 ? '¡Hola' : '¡Buenas noches';
  const hello = name ? `${base}, ${name}` : base;
  if (streak >= 2) return `${hello}! Van ${String(streak)} días seguidos: se nota el esfuerzo.`;
  return `${hello}! Hoy alcanza con un ratito.`;
}

/** Tarjeta "Pausa para vos": un minuto para quien cuida. */
function PauseCard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Pausa para vos: un minuto para respirar"
      onPress={() => {
        router.push('/pausa');
      }}
      style={({ pressed }) => [styles.pause, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={styles.pauseIcon}>
        <Wind color={colors.success} size={26} aria-hidden />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subheading">Pausa para vos</Text>
        <Text tone="muted">Un minuto para respirar. También cuenta.</Text>
      </View>
      <ChevronRight color={colors.inkMuted} size={24} aria-hidden />
    </Pressable>
  );
}

/** "Para hacer": las actividades que dejaron para más tarde (hasta 4), con acceso a la lista. */
function ToDoStrip({ familyId }: { familyId: string }) {
  const saved = useSavedActivities(familyId);
  const list = (saved.data ?? []).flatMap((s) =>
    s.activities
      ? [
          {
            slug: s.activities.slug,
            title: s.activities.title,
            categories: s.activities.activity_category_links.map((l) => l.category_code),
          },
        ]
      : [],
  );
  if (list.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      <Text variant="heading">Para hacer</Text>
      <ActivityGrid activities={list.slice(0, 4)} maxContent={720} />
      {list.length > 4 ? (
        <Link href="/mis-actividades" asChild>
          <Button label={`Ver las ${String(list.length)}`} variant="ghost" />
        </Link>
      ) : null}
    </View>
  );
}

/**
 * Hoy (rediseño de 2026): Brote saluda con la racha y los logros como chips; primero "Para hoy"
 * (con la invitación a personalizar debajo, ver `TodaySection`), lo guardado y una pausa.
 */
export default function TodayScreen() {
  const styles = useStyles();
  const me = useMe();
  const family = me.data?.families[0];
  const progress = useFamilyProgress(family?.id);
  // Solo hace falta sin familia (para mandar a profesionales a su espacio).
  const professional = useMyProfessionalProfile({ enabled: me.isSuccess && !family });

  if (me.isPending) return <LoadingScreen />;
  if (me.isError) return <ErrorScreen error={me.error} onRetry={() => void me.refetch()} />;
  if (!family) {
    // Sin familia: quien es profesional o administra va a su espacio; las familias, a empezar.
    if (professional.isPending) return <LoadingScreen />;
    if (professional.data) return <Redirect href="/profesional" />;
    if (me.data.permissions.length > 0) return <Redirect href="/admin" />;
    return <Redirect href="/bienvenida" />;
  }

  // Quien entra con correo no carga nombre: el perfil queda con la parte del correo, que no saludamos.
  const display = me.data.profile.displayName;
  const fromEmail = display === me.data.email?.split('@')[0];
  const firstName = fromEmail ? null : (display.split(' ')[0] ?? null);
  const streak = progress.data?.streak ?? 0;

  return (
    <Screen>
      <BroteSays mood={streak >= 2 ? 'feliz' : 'hola'} size={88}>
        {greeting(firstName, streak)}
      </BroteSays>
      <View style={styles.chips}>
        <StreakChip days={streak} />
        <LogrosChip familyId={family.id} />
      </View>
      <TodaySection familyId={family.id} role={family.role} />
      <ToDoStrip familyId={family.id} />
      <PauseCard />
      <WelcomeBack />
    </Screen>
  );
}
