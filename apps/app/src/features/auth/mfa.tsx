import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Card, ConfirmAction, Text, TextField } from '@/ui';

import { authKeys } from './queries';

// Verificación en dos pasos (TOTP) con Supabase Auth. Es obligatoria para usar la
// administración: las políticas exigen aal2 (SECURITY_AND_PRIVACY.md §2).

export const mfaKeys = { status: ['mfa'] as const };

export function useMfaStatus() {
  return useQuery({
    queryKey: mfaKeys.status,
    queryFn: async () => {
      const [aal, factors] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (aal.error) throw aal.error;
      if (factors.error) throw factors.error;
      const verified = factors.data.totp.filter((f) => f.status === 'verified');
      return {
        level: aal.data.currentLevel,
        factorId: verified[0]?.id ?? null,
        enrolled: verified.length > 0,
      };
    },
  });
}

function useAfterMfaChange() {
  const queryClient = useQueryClient();
  return async () => {
    // La sesión pasa a aal2: se renueva el token y todo lo que dependía del nivel.
    await supabase.auth.refreshSession();
    await queryClient.invalidateQueries();
    await queryClient.invalidateQueries({ queryKey: authKeys.me });
  };
}

/** Pide el código de la app autenticadora para elevar la sesión a aal2. */
export function MfaChallenge({ factorId }: { factorId: string }) {
  const after = useAfterMfaChange();
  const [code, setCode] = useState('');
  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (error) throw error;
    },
    onSuccess: after,
  });
  return (
    <Card>
      <Text variant="subheading">Verificación en dos pasos</Text>
      <Text tone="muted">Escribí el código de 6 dígitos de tu app autenticadora.</Text>
      <TextField
        label="Código"
        value={code}
        onChangeText={setCode}
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
      />
      {verify.error ? <Banner tone="danger">{friendlyError(verify.error)}</Banner> : null}
      <Button
        label="Verificar"
        icon={ShieldCheck}
        disabled={code.trim().length !== 6}
        loading={verify.isPending}
        onPress={() => {
          verify.mutate();
        }}
      />
    </Card>
  );
}

/** Activar o desactivar la verificación en dos pasos (Perfil). */
export function MfaSettingsCard() {
  const status = useMfaStatus();
  const after = useAfterMfaChange();
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState('');

  const enroll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Crecer en Casa ${String(Date.now())}`,
      });
      if (error) throw error;
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    },
  });
  const confirm = useMutation({
    mutationFn: async () => {
      if (!enrollment) return;
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: code.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setEnrollment(null);
      setCode('');
      await after();
    },
  });
  const remove = useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    onSuccess: after,
  });

  if (status.isPending || status.isError) return null;
  const error = enroll.error ?? confirm.error ?? remove.error;

  return (
    <Card>
      <Text variant="subheading">Verificación en dos pasos</Text>
      {status.data.enrolled ? (
        <>
          <Text tone="success">Activada con una app autenticadora.</Text>
          {status.data.factorId ? (
            <ConfirmAction
              label="Desactivar"
              confirmLabel="Sí, desactivar"
              description="Sin la verificación en dos pasos no vas a poder usar la administración."
              loading={remove.isPending}
              onConfirm={() => {
                if (status.data.factorId) remove.mutate(status.data.factorId);
              }}
            />
          ) : null}
        </>
      ) : enrollment ? (
        <View style={{ gap: 12 }}>
          <Text>
            Escaneá el código con una app autenticadora (Google Authenticator, Microsoft
            Authenticator, 1Password…) y escribí el código de 6 dígitos que te muestra.
          </Text>
          <Image
            source={{ uri: enrollment.qr }}
            style={{ width: 180, height: 180, alignSelf: 'center', backgroundColor: '#fff' }}
            accessibilityLabel="Código QR para la app autenticadora"
          />
          <Text variant="small" tone="muted" selectable>
            {`Si no podés escanear, cargá esta clave a mano: ${enrollment.secret}`}
          </Text>
          <TextField
            label="Código"
            value={code}
            onChangeText={setCode}
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <Button
            label="Activar"
            disabled={code.trim().length !== 6}
            loading={confirm.isPending}
            onPress={() => {
              confirm.mutate();
            }}
          />
        </View>
      ) : (
        <>
          <Text tone="muted">
            Suma un código de tu teléfono al ingresar. Es obligatoria para la administración.
          </Text>
          <Button
            label="Activar la verificación en dos pasos"
            variant="secondary"
            icon={ShieldCheck}
            loading={enroll.isPending}
            onPress={() => {
              enroll.mutate();
            }}
          />
        </>
      )}
      {error ? <Banner tone="danger">{friendlyError(error)}</Banner> : null}
    </Card>
  );
}
