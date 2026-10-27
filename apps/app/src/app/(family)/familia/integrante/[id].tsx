import { formatBirthMonth, type InterestSchema } from '@crecer/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { View } from 'react-native';
import type { z } from 'zod';

import { friendlyError } from '@/copy/errors';
import { interestLabel, memberAge } from '@/features/families/labels';
import { MemberForm } from '@/features/families/MemberForm';
import {
  canManage,
  useActiveFamily,
  useDeleteMember,
  useMembers,
  useUpdateMember,
} from '@/features/families/queries';
import {
  Badge,
  Banner,
  Button,
  Card,
  ConfirmAction,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isPending, family } = useActiveFamily();
  const members = useMembers(family?.id);
  const update = useUpdateMember(family?.id);
  const remove = useDeleteMember(family?.id);

  if (isPending || members.isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;
  if (members.isError) return <ErrorState onRetry={() => void members.refetch()} />;

  const member = members.data.find((m) => m.id === id);
  if (!member) {
    return (
      <Screen>
        <EmptyState
          icon={UserRound}
          title="No encontramos a este integrante"
          description="Puede que lo hayan eliminado o que no tengas acceso."
        />
      </Screen>
    );
  }

  const manage = canManage(family.role);
  const archived = member.archived_at !== null;

  return (
    <Screen>
      <Text variant="title">{member.alias}</Text>
      <Text tone="muted">{memberAge(member.birth_month)}</Text>
      {archived ? (
        <Banner tone="caution" title="Integrante archivado">
          Sus datos no se usan para sugerencias ni se comparten. Si querés volver a acompañarlo en
          la plataforma, agregalo de nuevo con un consentimiento nuevo.
        </Banner>
      ) : null}

      {manage && !archived ? (
        <Card>
          <Text variant="subheading">Editar</Text>
          <MemberForm
            defaultValues={{
              alias: member.alias,
              birthMonth: formatBirthMonth(member.birth_month),
              interests: member.interests as z.infer<typeof InterestSchema>[],
            }}
            submitLabel="Guardar cambios"
            loading={update.isPending}
            onSubmit={(values) => {
              update.mutate({
                id: member.id,
                changes: {
                  alias: values.alias,
                  birth_month: values.birthMonth,
                  interests: values.interests,
                },
              });
            }}
          >
            {update.isSuccess ? <Banner tone="success">Guardamos los cambios.</Banner> : null}
            {update.error ? <Banner tone="danger">{friendlyError(update.error)}</Banner> : null}
          </MemberForm>
        </Card>
      ) : (
        <Card>
          <Text variant="subheading">Intereses</Text>
          {member.interests.length === 0 ? (
            <Text tone="muted">Sin intereses cargados.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {member.interests.map((i) => (
                <Badge key={i}>{interestLabel(i)}</Badge>
              ))}
            </View>
          )}
        </Card>
      )}

      {manage ? (
        <Card>
          <Text variant="subheading">Otras acciones</Text>
          {archived ? null : (
            <Button
              label="Archivar"
              variant="secondary"
              loading={update.isPending}
              onPress={() => {
                update.mutate({
                  id: member.id,
                  changes: { archived_at: new Date().toISOString() },
                });
              }}
            />
          )}
          <ConfirmAction
            label="Eliminar definitivamente"
            confirmLabel="Sí, eliminar"
            description={`Se borran ${member.alias} y todos sus datos asociados. Esta acción no se puede deshacer.`}
            loading={remove.isPending}
            onConfirm={() => {
              remove.mutate(member.id, {
                onSuccess: () => {
                  router.replace('/familia');
                },
              });
            }}
          />
          {remove.error ? <Banner tone="danger">{friendlyError(remove.error)}</Banner> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
