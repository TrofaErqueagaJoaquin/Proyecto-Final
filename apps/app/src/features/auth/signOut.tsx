import { useMutation } from '@tanstack/react-query';
import { router, useRouter } from 'expo-router';
import { CircleUserRound, LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { Button, ErrorBanner, makeStyles, Text } from '@/ui';

// Cerrar sesión a pedido de la persona: al salir va a la portada con un aviso, no a "Ingresar".

/** Momento del último "Cerrar sesión" pedido (0 si no hubo). */
let requestedAt = 0;
const WINDOW_MS = 15_000;

/** ¿La sesión se cerró porque la persona lo pidió hace un momento? (si no, venció sola). */
export function signOutWasRequested(now = Date.now()): boolean {
  return requestedAt > 0 && now - requestedAt < WINDOW_MS;
}

export type SignOutScope = 'local' | 'global';

export function useSignOut() {
  return useMutation({
    mutationFn: async (scope: SignOutScope) => {
      requestedAt = Date.now();
      const { error } = await supabase.auth.signOut({ scope });
      if (error) throw error;
    },
    onError: async () => {
      // Sin internet, supabase-js igual borra la sesión local y devuelve error: si ya no hay
      // sesión, la salida sí ocurrió y se mantiene el aviso de la portada.
      if ((await supabase.auth.getSession()).data.session) requestedAt = 0;
    },
  });
}

/** "Ingresar de nuevo" con sesión vencida: cierra la sesión local y va a Ingresar. */
export function signInAgain() {
  void supabase.auth
    .signOut({ scope: 'local' })
    .catch(() => undefined)
    .finally(() => {
      router.replace('/ingresar');
    });
}

const useStyles = makeStyles((t) => ({
  confirm: {
    gap: t.space.md,
    padding: t.space.lg,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  exits: { gap: t.space.sm, alignItems: 'center' },
}));

/** "Cerrar sesión" con una confirmación simple antes de salir. */
export function SignOutButton({
  scope = 'local',
  label = 'Cerrar sesión',
  variant = 'secondary',
}: {
  scope?: SignOutScope;
  label?: string;
  variant?: 'secondary' | 'ghost';
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();

  if (!open) {
    return (
      <Button
        label={label}
        variant={variant}
        icon={scope === 'local' ? LogOut : undefined}
        onPress={() => {
          setOpen(true);
        }}
      />
    );
  }
  return (
    <View style={styles.confirm} role="alert">
      <Text variant="bodyStrong">
        {scope === 'local' ? '¿Cerrar sesión?' : '¿Cerrar sesión en todos tus dispositivos?'}
      </Text>
      <View style={styles.row}>
        <Button
          label="Sí, salir"
          icon={LogOut}
          loading={signOut.isPending}
          onPress={() => {
            signOut.mutate(scope);
          }}
        />
        <Button
          label="Cancelar"
          variant="secondary"
          disabled={signOut.isPending}
          onPress={() => {
            signOut.reset();
            setOpen(false);
          }}
        />
      </View>
      <ErrorBanner
        error={signOut.error}
        onRetry={() => {
          signOut.mutate(scope);
        }}
        retryLoading={signOut.isPending}
      />
    </View>
  );
}

/**
 * Salidas de las pantallas sin barra de navegación (código de verificación, error, sin acceso):
 * "Volver a mi cuenta" y "Cerrar sesión".
 */
export function SpaceExits({ account = true }: { account?: boolean }) {
  const styles = useStyles();
  const router = useRouter();
  return (
    <View style={styles.exits}>
      {account ? (
        <Button
          label="Volver a mi cuenta"
          variant="secondary"
          icon={CircleUserRound}
          onPress={() => {
            router.replace('/perfil');
          }}
        />
      ) : null}
      <SignOutButton />
    </View>
  );
}
