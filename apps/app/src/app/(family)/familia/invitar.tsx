import {
  CreateInvitationSchema,
  FAMILY_ROLE_DESCRIPTIONS,
  FAMILY_ROLE_LABELS,
  type CreateInvitationInput,
  type CreateInvitationResponse,
  type FamilyRole,
} from '@crecer/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Clipboard from 'expo-clipboard';
import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { Platform, Share, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { canManage, useActiveFamily, useCreateInvitation } from '@/features/families/queries';
import { Banner, Button, Card, ChipGroup, FormTextField, Screen, Skeleton, Text } from '@/ui';

function roleOptions(inviterRole: FamilyRole) {
  // Igual que la política RLS: el owner invita cualquier rol; un guardian, solo cuidadores.
  const allowed: FamilyRole[] =
    inviterRole === 'owner' ? ['guardian', 'caregiver', 'owner'] : ['caregiver'];
  return allowed.map((value) => ({ value, label: FAMILY_ROLE_LABELS[value] }));
}

function ShareInvitation({ result, email }: { result: CreateInvitationResponse; email: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Te invito a nuestra familia en Crecer en Casa: ${result.inviteUrl}`;
  return (
    <Card>
      <Text variant="subheading">Invitación lista</Text>
      {result.emailSent ? (
        <Banner tone="success">Le enviamos un correo a {email}.</Banner>
      ) : (
        <Banner tone="info">
          Compartí este enlace con {email} (por ejemplo, por WhatsApp). Vence en 7 días y solo
          funciona si ingresa con ese mismo correo.
        </Banner>
      )}
      <Text selectable variant="small" tone="muted">
        {result.inviteUrl}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={copied ? 'Copiado' : 'Copiar enlace'}
          variant="secondary"
          onPress={() => {
            void Clipboard.setStringAsync(result.inviteUrl).then(() => {
              setCopied(true);
            });
          }}
        />
        {Platform.OS !== 'web' ? (
          <Button
            label="Compartir"
            variant="secondary"
            onPress={() => {
              void Share.share({ message });
            }}
          />
        ) : null}
      </View>
      <Link href="/familia" asChild>
        <Button label="Volver a Familia" variant="ghost" />
      </Link>
    </Card>
  );
}

export default function InviteScreen() {
  const { isPending, family } = useActiveFamily();
  const invite = useCreateInvitation(family?.id);
  const { control, handleSubmit, getValues } = useForm<CreateInvitationInput>({
    resolver: zodResolver(CreateInvitationSchema),
    defaultValues: { email: '', role: 'caregiver' },
  });
  const role = useController({ control, name: 'role' });

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;
  if (!canManage(family.role)) return <Redirect href="/familia" />;

  const onSubmit = handleSubmit((values) => {
    invite.mutate(values);
  });

  if (invite.data) {
    return (
      <Screen>
        <Text variant="title">Invitar a otro adulto</Text>
        <ShareInvitation result={invite.data} email={getValues('email')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">Invitar a otro adulto</Text>
      <Text tone="muted">
        Sumá a quienes comparten la crianza. Cada rol ve y puede hacer cosas distintas.
      </Text>
      <Card>
        <FormTextField
          control={control}
          name="email"
          label="Correo de la persona invitada"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          inputMode="email"
        />
        <ChipGroup
          label="Rol en la familia"
          options={roleOptions(family.role)}
          value={role.field.value}
          onChange={role.field.onChange}
          error={role.fieldState.error?.message}
        />
        <Text variant="small" tone="muted">
          {FAMILY_ROLE_DESCRIPTIONS[role.field.value]}
        </Text>
        {invite.error ? <Banner tone="danger">{friendlyError(invite.error)}</Banner> : null}
        <Button
          label="Crear invitación"
          loading={invite.isPending}
          onPress={() => void onSubmit()}
        />
      </Card>
    </Screen>
  );
}
