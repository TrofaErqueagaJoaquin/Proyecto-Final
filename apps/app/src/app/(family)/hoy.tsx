import { Redirect, useRouter } from 'expo-router';
import { ChevronRight, Wind } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useMe } from '@/features/auth/queries';
import { BroteSays } from '@/features/brote/Brote';
import { PersonalizeCard } from '@/features/chequeo/PersonalizeCard';
import { canManage } from '@/features/families/queries';
import { LogrosStrip, StreakChip, useFamilyProgress } from '@/features/logros/LogrosStrip';
import { useMyProfessionalProfile } from '@/features/professionals/queries';
import { TodaySection } from '@/features/plans/TodaySection';
import { ErrorState, makeStyles, Screen, Skeleton, Text, useTheme } from '@/ui';

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
}));

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

/**
 * Hoy (rediseño de 2026): Brote saluda, la racha a la vista, UNA idea para hoy, la invitación en
 * grande a personalizar (chequeo o tema), una pausa para quien cuida y los logros.
 */
export default function TodayScreen() {
  const me = useMe();
  const family = me.data?.families[0];
  const progress = useFamilyProgress(family?.id);
  const professional = useMyProfessionalProfile();

  if (me.isPending) {
    return (
      <Screen>
        <Skeleton height={96} />
        <Skeleton height={180} />
      </Screen>
    );
  }
  if (me.isError) return <ErrorState onRetry={() => void me.refetch()} />;
  if (!family) {
    // Sin familia: quien es profesional o administra va a su espacio; las familias, a empezar.
    if (professional.isPending) return <Skeleton height={180} />;
    if (professional.data) return <Redirect href="/profesional" />;
    if (me.data.permissions.length > 0) return <Redirect href="/admin" />;
    return <Redirect href="/bienvenida" />;
  }

  // Quien entra con correo no carga nombre: el perfil queda con la parte del correo, que no saludamos.
  const display = me.data.profile.displayName;
  const fromEmail = display === me.data.email?.split('@')[0];
  const firstName = fromEmail ? null : (display.split(' ')[0] ?? null);
  const streak = progress.data?.streak ?? 0;
  const manage = canManage(family.role);

  return (
    <Screen>
      <BroteSays mood={streak >= 2 ? 'feliz' : 'hola'} size={88}>
        {greeting(firstName, streak)}
      </BroteSays>
      <StreakChip days={streak} />
      {manage ? <PersonalizeCard familyId={family.id} /> : null}
      <TodaySection familyId={family.id} role={family.role} />
      <PauseCard />
      <LogrosStrip familyId={family.id} />
    </Screen>
  );
}
