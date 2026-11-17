import { ASSISTANT_QUESTION_MAX } from '@crecer/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { MessageCircle, Send, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View, type TextInputKeyPressEvent } from 'react-native';

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
  Disclosure,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
  useTheme,
} from '@/ui';

const UPDATED = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const FAMILY = 'familia';
const EXAMPLES = [
  'Se enoja cuando le apago la tablet',
  'Le cuesta dormirse',
  '¿A qué jugar en casa?',
  'Ideas para la rutina de la mañana',
] as const;

/** La primera pregunta viaja a la conversación por la caché (no por la dirección: es privada). */
const firstQuestionKey = (conversationId: string) => ['asistente-primera-pregunta', conversationId];

/** En la web, Enter envía y Shift+Enter baja de renglón: ¿hay que enviar con esta tecla? */
function isEnterToSend(event: TextInputKeyPressEvent): boolean {
  const native = event.nativeEvent as { key: string; shiftKey?: boolean };
  if (native.key !== 'Enter' || native.shiftKey === true) return false;
  event.preventDefault();
  return true;
}

/** Preguntar enseguida: el campo primero; "sobre quién" y el contexto, plegados en "Ajustes". */
function Ask({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const members = useMembers(familyId);
  const consent = useAiContextConsent(familyId);
  const grant = useGrantAiContext(familyId);
  const create = useCreateConversation(familyId);
  const [question, setQuestion] = useState('');
  const [about, setAbout] = useState<string>(FAMILY);
  // Por defecto usa el contexto solo si la familia ya dio el permiso.
  const [chosenContext, setWithContext] = useState<boolean | null>(null);
  const withContext = chosenContext ?? consent.data === true;
  const needsConsent = withContext && consent.data === false;
  const busy = create.isPending || grant.isPending;

  const options = [
    { value: FAMILY, label: 'La familia en general' },
    ...(members.data ?? [])
      .filter((m) => m.archived_at === null)
      .map((m) => ({ value: m.id, label: m.alias })),
  ];

  const start = () => {
    const text = question.trim();
    if (!text || busy) return;
    void (async () => {
      if (needsConsent) await grant.mutateAsync();
      const id = await create.mutateAsync({
        memberId: about === FAMILY ? null : about,
        usePersonalContext: withContext,
      });
      queryClient.setQueryData(firstQuestionKey(id), text);
      setQuestion('');
      router.push(`/asistente/${id}`);
    })().catch(() => undefined);
  };

  return (
    <Card>
      <TextField
        label="¿Qué te preocupa?"
        value={question}
        onChangeText={setQuestion}
        multiline
        maxLength={ASSISTANT_QUESTION_MAX}
        placeholder="Escribilo como se lo contarías a alguien"
        onKeyPress={
          Platform.OS === 'web'
            ? (event) => {
                if (isEnterToSend(event)) start();
              }
            : undefined
        }
      />
      <ChipGroup
        label="O empezá con una de estas"
        options={EXAMPLES.map((e) => ({ value: e, label: e }))}
        value={EXAMPLES.find((e) => e === question) ?? null}
        onChange={setQuestion}
      />
      {needsConsent ? (
        <Banner tone="info" title="Hace falta tu permiso">
          Para que conozca a tu familia, dalo una vez. Lo podés quitar en Privacidad.
        </Banner>
      ) : null}
      {(create.error ?? grant.error) ? (
        <Banner tone="danger">{friendlyError(create.error ?? grant.error)}</Banner>
      ) : null}
      <Button
        label={needsConsent ? 'Dar permiso y preguntar' : 'Preguntar'}
        icon={Send}
        fullWidth
        loading={busy}
        disabled={question.trim() === ''}
        onPress={start}
      />
      <Disclosure title="Ajustes">
        <ChipGroup label="¿Sobre quién?" options={options} value={about} onChange={setAbout} />
        <Checkbox
          checked={withContext}
          onChange={setWithContext}
          label="Que conozca a mi familia"
        />
        <Text variant="small" tone="muted">
          Recibe edades, la última evaluación, objetivos, actividades y preferencias. Nunca nombres
          ni notas de profesionales.
        </Text>
      </Disclosure>
    </Card>
  );
}

/** Asistente (UX_AND_NAVIGATION.md §5.3): preguntar enseguida y las conversaciones anteriores. */
export default function AssistantScreen() {
  const { isPending, family } = useActiveFamily();
  const conversations = useConversations(family?.id);
  const { colors } = useTheme();

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/bienvenida" />;
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
      <Text tone="muted">Respuestas cortas, con la fuente. Orienta: no diagnostica.</Text>
      <Ask familyId={family.id} />

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
