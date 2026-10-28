import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { BriefcaseMedical, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { authKeys, useMe } from '@/features/auth/queries';
import { MfaSettingsCard } from '@/features/auth/mfa';
import { useMyProfessionalProfile } from '@/features/professionals/queries';
import { supabase } from '@/lib/supabase';
import {
  Banner,
  Button,
  Card,
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

/** Selector de espacio: solo navegación, no otorga permisos (ROLES_AND_PERMISSIONS.md §1). */
function ProfessionalSpaceCard() {
  const profile = useMyProfessionalProfile();
  if (profile.isPending || profile.isError) return null;
  return (
    <Card>
      <Text variant="subheading">Espacio profesional</Text>
      <Text tone="muted">
        {profile.data
          ? 'Tus casos, las solicitudes de las familias y tu perfil en el directorio.'
          : '¿Sos psicóloga, psicopedagogo, pediatra o terapeuta? Creá tu perfil para que las familias te encuentren.'}
      </Text>
      <Link href={profile.data ? '/profesional' : '/profesional/perfil'} asChild>
        <Button
          label={profile.data ? 'Ir al espacio profesional' : 'Crear mi perfil profesional'}
          variant="secondary"
          icon={BriefcaseMedical}
        />
      </Link>
    </Card>
  );
}

/** Arranca con el nombre ya cargado: no hace falta sincronizarlo con un efecto. */
function NameCard({ initialName, email }: { initialName: string; email: string | null }) {
  const [name, setName] = useState(initialName);
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
      <Text variant="subheading">Tus datos</Text>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        error={nameError}
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
      {saveProfile.error ? <Banner tone="danger">{friendlyError(saveProfile.error)}</Banner> : null}
    </Card>
  );
}

export default function ProfileScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { preference, setPreference } = useThemeContext();
  const me = useMe();
  const saveProfile = useSaveProfile();

  const signOut = useMutation({
    mutationFn: async (scope: 'local' | 'global') => {
      const { error } = await supabase.auth.signOut({ scope });
      if (error) throw error;
    },
  });

  if (me.isPending)
    return (
      <Screen>
        <Skeleton height={200} />
      </Screen>
    );
  if (me.isError) return <ErrorState onRetry={() => void me.refetch()} />;

  return (
    <Screen>
      <Text variant="title">Perfil</Text>

      <NameCard
        key={me.data.profile.displayName}
        initialName={me.data.profile.displayName}
        email={me.data.email}
      />

      <Card>
        <Text variant="subheading">Apariencia</Text>
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
      </Card>

      <ProfessionalSpaceCard />

      <MfaSettingsCard />

      {me.data.permissions.length > 0 ? (
        <Card>
          <Text variant="subheading">Administración</Text>
          <Text tone="muted">
            Tenés un rol administrativo. Se usa con verificación en dos pasos.
          </Text>
          <Link href="/admin" asChild>
            <Button label="Ir a la administración" variant="secondary" />
          </Link>
        </Card>
      ) : null}

      <Card>
        <Text variant="subheading">Seguridad</Text>
        <View style={styles.actions}>
          <Link href={'/nueva-clave'} asChild>
            <Button label="Cambiar contraseña" variant="secondary" />
          </Link>
          <Button
            label="Cerrar sesión"
            variant="secondary"
            icon={LogOut}
            loading={signOut.isPending && signOut.variables === 'local'}
            onPress={() => {
              signOut.mutate('local');
            }}
          />
          <Button
            label="Cerrar sesión en todos los dispositivos"
            variant="ghost"
            loading={signOut.isPending && signOut.variables === 'global'}
            onPress={() => {
              signOut.mutate('global');
            }}
          />
        </View>
        {signOut.error ? <Banner tone="danger">{friendlyError(signOut.error)}</Banner> : null}
      </Card>
    </Screen>
  );
}
