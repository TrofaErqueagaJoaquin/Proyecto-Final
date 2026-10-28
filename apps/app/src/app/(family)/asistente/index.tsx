import { Redirect, router } from 'expo-router';
import { MessageCircle, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  useAiContextConsent,
  useConversations,
  useCreateConversation,
  useGrantAiContext,
} from '@/features/assistant/queries';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { LinkCard } from '@/features/library/LinkCard';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';

const UPDATED = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const FAMILY = 'familia';

function NewConversation({ familyId }: { familyId: string }) {
  const members = useMembers(familyId);
  const consent = useAiContextConsent(familyId);
  const grant = useGrantAiContext(familyId);
  const create = useCreateConversation(familyId);
  const [about, setAbout] = useState<string>(FAMILY);
  const [useContext, setUseContext] = useState(false);

  const options = [
    { value: FAMILY, label: 'La familia en general' },
    ...(members.data ?? [])
      .filter((m) => m.archived_at === null)
      .map((m) => ({ value: m.id, label: m.alias })),
  ];

  return (
    <Card>
      <Text variant="subheading">Nueva conversación</Text>
      <ChipGroup label="¿Sobre quién?" options={options} value={about} onChange={setAbout} />
      <Checkbox
        checked={useContext}
        onChange={setUseContext}
        label="Usar el contexto de la familia"
      />
      <Text variant="small" tone="muted">
        Si lo activás, el asistente recibe la edad (sin el apodo), las bandas de la última
        evaluación, las recomendaciones y objetivos activos, las últimas actividades y sus
        preferencias. Nunca recibe nombres ni las observaciones de profesionales.
      </Text>
      {useContext && consent.data === false ? (
        <Banner tone="info" title="Hace falta tu permiso">
          Para usar el contexto con el asistente, la familia tiene que darlo una vez. Lo podés
          revocar en Privacidad.
        </Banner>
      ) : null}
      {(create.error ?? grant.error) ? (
        <Banner tone="danger">{friendlyError(create.error ?? grant.error)}</Banner>
      ) : null}
      <Button
        label={useContext && consent.data === false ? 'Dar permiso y empezar' : 'Empezar'}
        icon={MessageCircle}
        loading={create.isPending || grant.isPending}
        onPress={() => {
          void (async () => {
            if (useContext && consent.data === false) await grant.mutateAsync();
            const id = await create.mutateAsync({
              memberId: about === FAMILY ? null : about,
              usePersonalContext: useContext,
            });
            router.push(`/asistente/${id}`);
          })().catch(() => undefined);
        }}
      />
    </Card>
  );
}

/** Asistente (UX_AND_NAVIGATION.md §5.3): conversaciones y "nueva conversación". */
export default function AssistantScreen() {
  const { isPending, family } = useActiveFamily();
  const conversations = useConversations(family?.id);
  const { colors } = useTheme();

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;
  if (!canManage(family.role)) {
    return (
      <Screen>
        <EmptyState
          icon={Sparkles}
          title="El asistente es para los responsables de la familia"
          description="Mientras tanto, la biblioteca y las actividades están disponibles."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">Asistente</Text>
      <Text tone="muted">
        Respuestas breves a partir de las fichas revisadas de Crecer en Casa, siempre con la fuente.
        Orienta: no diagnostica ni reemplaza una consulta.
      </Text>
      <NewConversation familyId={family.id} />

      {conversations.isPending ? (
        <Skeleton height={120} />
      ) : conversations.isError ? (
        <ErrorState onRetry={() => void conversations.refetch()} />
      ) : conversations.data.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text variant="heading">Conversaciones</Text>
          {conversations.data.map((c) => (
            <LinkCard
              key={c.id}
              href={`/asistente/${c.id}`}
              title={c.title}
              description={`Actualizada el ${UPDATED.format(new Date(c.updated_at))}`}
              leading={<MessageCircle size={24} color={colors.primary} aria-hidden />}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
