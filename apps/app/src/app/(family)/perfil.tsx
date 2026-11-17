import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, type Href } from 'expo-router';
import {
  BriefcaseMedical,
  House,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { authKeys, useMe } from '@/features/auth/queries';
import { MfaSettingsCard } from '@/features/auth/mfa';
import { SignOutButton } from '@/features/auth/signOut';
import { feedback, setFeedbackSettings, useFeedbackSettings } from '@/features/feedback/feedback';
import { useMyProfessionalProfile } from '@/features/professionals/queries';
import { supabase } from '@/lib/supabase';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Disclosure,
  ErrorBanner,
  ErrorState,
  makeStyles,
  Screen,
  Skeleton,
  Text,
  TextField,
  useTheme,
  useThemeContext,
  type ThemePreference,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'Como el sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

const useStyles = makeStyles((t) => ({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    minHeight: minTouchTarget,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
  },
  optionActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
  actions: { gap: t.space.sm },
  spaces: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
}));

function useSaveProfile() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: { display_name?: string; theme_pref?: ThemePreference }) => {
      if (auth.status !== 'signedIn') throw new Error('Sin sesión');
      const { error } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', auth.session.user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

interface Space {
  href: Href;
  label: string;
  icon: LucideIcon;
}

/**
 * Cambio de espacio: solo navegación, no otorga permisos (ROLES_AND_PERMISSIONS.md §1).
 * Aparece si hay algún espacio además de Familia (si no, no hay adónde cambiar).
 */
function SpaceSwitcher({ hasFamily, isStaff }: { hasFamily: boolean; isStaff: boolean }) {
  const styles = useStyles();
  const professional = useMyProfessionalProfile();
  const spaces: Space[] = [];
  if (hasFamily) spaces.push({ href: '/hoy', label: 'Familia', icon: House });
  if (professional.data) {
    spaces.push({ href: '/profesional', label: 'Profesional', icon: BriefcaseMedical });
  }
  if (isStaff) spaces.push({ href: '/admin', label: 'Administración', icon: ShieldCheck });
  if (!spaces.some((space) => space.label !== 'Familia')) return null;
  return (
    <View style={styles.actions} role="navigation" accessibilityLabel="Cambiar de espacio">
      <Text variant="bodyStrong">Ir a:</Text>
      <View style={styles.spaces}>
        {spaces.map((space) => (
          <Link key={space.label} href={space.href} asChild>
            <Button label={space.label} variant="secondary" icon={space.icon} />
          </Link>
        ))}
      </View>
    </View>
  );
}

/** Crear el perfil profesional (quien ya lo tiene, entra desde "Ir a"). */
function CreateProfessionalCard() {
  const profile = useMyProfessionalProfile();
  if (profile.isPending || profile.isError || profile.data) return null;
  return (
    <Card>
      <Text variant="subheading">Espacio profesional</Text>
      <Text tone="muted">
        ¿Sos psicóloga, psicopedagogo, pediatra o terapeuta? Creá tu perfil para que las familias te
        encuentren.
      </Text>
      <Link href="/profesional/perfil" asChild>
        <Button label="Crear mi perfil profesional" variant="secondary" icon={BriefcaseMedical} />
      </Link>
    </Card>
  );
}

/** Arranca con el nombre ya cargado: no hace falta sincronizarlo con un efecto. */
function NameCard({ initialName, email }: { initialName: string; email: string | null }) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const saveProfile = useSaveProfile();
  const trimmed = name.trim();
  const nameError =
    trimmed.length === 0
      ? 'Escribí un nombre.'
      : trimmed.length > 80
        ? 'Usá como máximo 80 caracteres.'
        : undefined;

  return (
    <Card>
      <Text variant="subheading">Mis datos</Text>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        onBlur={() => {
          setTouched(true);
        }}
        // El error aparece al salir del campo, no mientras se escribe.
        error={touched ? nameError : undefined}
        autoComplete="name"
      />
      <Text variant="small" tone="muted">
        Correo: {email ?? 'sin correo'}
      </Text>
      <Button
        label="Guardar cambios"
        variant="secondary"
        disabled={nameError !== undefined || trimmed === initialName}
        loading={saveProfile.isPending}
        onPress={() => {
          saveProfile.mutate({ display_name: trimmed });
        }}
      />
      {saveProfile.isSuccess ? <Banner tone="success">Guardamos tus cambios.</Banner> : null}
      <ErrorBanner
        error={saveProfile.error}
        onRetry={() => {
          saveProfile.mutate({ display_name: trimmed });
        }}
        retryLoading={saveProfile.isPending}
      />
    </Card>
  );
}

/** Tema y sonidos (rediseño de 2026): sonidos y vibraciones se guardan en este dispositivo. */
function LookAndSoundCard() {
  const styles = useStyles();
  const theme = useTheme();
  const { preference, setPreference } = useThemeContext();
  const saveProfile = useSaveProfile();
  const settings = useFeedbackSettings();
  return (
    <Card>
      <Text variant="subheading">Cómo se ve y suena</Text>
      <View style={styles.options} role="radiogroup" accessibilityLabel="Tema de colores">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = preference === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={label}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => {
                setPreference(value);
                saveProfile.mutate({ theme_pref: value });
              }}
            >
              <Icon
                color={active ? theme.colors.primary : theme.colors.inkMuted}
                size={18}
                aria-hidden
              />
              <Text variant={active ? 'bodyStrong' : 'body'}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text tone="muted">
        Sonidos y vibraciones festejan las actividades hechas y los logros. Con el teléfono en
        silencio, no suenan.
      </Text>
      <Checkbox
        checked={settings.sound}
        label="Sonidos"
        onChange={(sound) => {
          setFeedbackSettings({ sound });
          if (sound) feedback('done');
        }}
      />
      <Checkbox
        checked={settings.vibration}
        label="Vibraciones"
        onChange={(vibration) => {
          setFeedbackSettings({ vibration });
          if (vibration) feedback('tap');
        }}
      />
    </Card>
  );
}

/** Mi cuenta: cambiar de espacio y cerrar sesión arriba; lo demás, en tres grupos. */
export default function ProfileScreen() {
  const styles = useStyles();
  const me = useMe();

  if (me.isPending)
    return (
      <Screen>
        <Skeleton height={200} />
      </Screen>
    );
  // Aunque no carguen los datos, siempre se puede cerrar la sesión (si no, la persona queda trabada).
  if (me.isError)
    return (
      <Screen>
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
        <SignOutButton />
      </Screen>
    );

  const isStaff = me.data.permissions.length > 0;
  return (
    <Screen>
      <Text variant="title">Mi cuenta</Text>

      <SpaceSwitcher hasFamily={me.data.families.length > 0} isStaff={isStaff} />
      <SignOutButton />

      <NameCard
        key={me.data.profile.displayName}
        initialName={me.data.profile.displayName}
        email={me.data.email}
      />

      <LookAndSoundCard />

      <Card>
        <Text variant="subheading">Seguridad</Text>
        <View style={styles.actions}>
          <Link href={'/nueva-clave?desde=perfil'} asChild>
            <Button label="Cambiar contraseña" variant="secondary" />
          </Link>
          <SignOutButton
            scope="global"
            label="Cerrar sesión en todos los dispositivos"
            variant="ghost"
          />
        </View>
      </Card>

      {/* Quien administra necesita la verificación en dos pasos: se muestra abierto. */}
      <Disclosure title="Opciones avanzadas" initiallyOpen={isStaff}>
        <MfaSettingsCard />
        <CreateProfessionalCard />
      </Disclosure>
    </Screen>
  );
}
