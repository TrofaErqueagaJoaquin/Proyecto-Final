import { formatBirthMonth, type InterestSchema } from '@crecer/shared';
import { Link, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ClipboardCheck, History, UserMinus, UserRound } from 'lucide-react-native';
import { View } from 'react-native';
import type { z } from 'zod';

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
  Disclosure,
  EmptyState,
  ErrorBanner,
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
  const archive = useUpdateMember(family?.id);
  const remove = useDeleteMember(family?.id);

  if (isPending || members.isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/bienvenida" />;
  if (members.isError) return <ErrorState onRetry={() => void members.refetch()} />;

  const member = members.data.find((m) => m.id === id);
  if (!member) {
    return (
      <Screen>
        <EmptyState
          icon={UserRound}
          title="No encontramos a este integrante"
          description="Puede que lo hayan borrado."
          action={
            <Link href="/familia" asChild>
              <Button label="Ir a Familia" />
            </Link>
          }
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
        <Banner tone="caution" title="Ya no lo siguen">
          Sus datos no se usan ni se comparten. Para volver a seguirlo, agregalo de nuevo.
        </Banner>
      ) : (
        <View style={{ gap: 8 }}>
          {manage ? (
            <Link href={`/chequeo/${member.id}`} asChild>
              <Button label="Hacer su chequeo" icon={ClipboardCheck} />
            </Link>
          ) : null}
          <Link href={`/evaluaciones/historial/${member.id}`} asChild>
            <Button label="Ver su historial" variant="secondary" icon={History} />
          </Link>
        </View>
      )}

      {manage && !archived ? (
        <Disclosure title="Cambiar sus datos">
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
            <ErrorBanner error={update.error} />
          </MemberForm>
        </Disclosure>
      ) : (
        <Card>
          <Text variant="subheading">Lo que le gusta</Text>
          {member.interests.length === 0 ? (
            <Text tone="muted">Todavía nada.</Text>
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
        <Disclosure title="Más opciones">
          {archived ? null : (
            <ConfirmAction
              label={`Dejar de seguir a ${member.alias}`}
              title={`¿Dejar de seguir a ${member.alias}?`}
              confirmLabel="Sí, dejar de seguir"
              icon={UserMinus}
              description="Sus datos dejan de usarse para sugerencias y de compartirse. No se borra nada."
              loading={archive.isPending}
              onConfirm={() => {
                archive.mutate({
                  id: member.id,
                  changes: { archived_at: new Date().toISOString() },
                });
              }}
            />
          )}
          <ErrorBanner error={archive.error} />
          <ConfirmAction
            label="Borrar para siempre"
            title={`¿Borrar a ${member.alias} para siempre?`}
            confirmLabel="Sí, borrar"
            description="Se borran sus datos y su historial. No se puede deshacer."
            loading={remove.isPending}
            onConfirm={() => {
              remove.mutate(member.id, {
                onSuccess: () => {
                  router.replace('/familia');
                },
              });
            }}
          />
          <ErrorBanner error={remove.error} />
        </Disclosure>
      ) : null}
    </Screen>
  );
}
