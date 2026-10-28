import type { AssistantCitation, AssistantMessage } from '@crecer/shared';
import { ASSISTANT_QUESTION_MAX } from '@crecer/shared';
import { RISK_RESPONSES, type HighRiskCategory } from '@crecer/domain';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, MessageCircle, Send } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  AssistantBubble,
  RiskCard,
  UserBubble,
  WhenToConsultCard,
} from '@/features/assistant/components';
import {
  assistantKeys,
  sendQuestion,
  useConversation,
  useDeleteConversation,
  type StoredMessage,
} from '@/features/assistant/queries';
import {
  Banner,
  Button,
  ConfirmAction,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
  useTheme,
} from '@/ui';

/** La respuesta fija guardada empieza con el título de su categoría: así se vuelve a mostrar la tarjeta. */
function storedRiskCategory(message: StoredMessage): HighRiskCategory | null {
  if (message.outcome !== 'risk_redirect') return null;
  const entry = (Object.entries(RISK_RESPONSES) as [HighRiskCategory, { title: string }][]).find(
    ([, response]) => message.body.startsWith(response.title),
  );
  return entry?.[0] ?? null;
}

function retentionLabel(expiresAt: string): string {
  const hours = (new Date(expiresAt).getTime() - Date.now()) / 3_600_000;
  if (hours <= 48) return 'Esta conversación se borra en 24 horas.';
  return `Esta conversación se borra en ${String(Math.round(hours / 24))} días.`;
}

function Message({
  role,
  body,
  citations,
  outcome,
  riskLevel,
  riskCategory,
}: {
  role: 'user' | 'assistant';
  body: string;
  citations: AssistantCitation[];
  outcome: AssistantMessage['outcome'] | null;
  riskLevel: 'none' | 'clinical' | 'high' | null;
  riskCategory: HighRiskCategory | null;
}) {
  if (role === 'user') return <UserBubble text={body} />;
  if (outcome === 'risk_redirect' && riskCategory) return <RiskCard category={riskCategory} />;
  return (
    <View style={{ gap: 8 }}>
      <AssistantBubble text={body} citations={citations} />
      {riskLevel === 'clinical' ? <WhenToConsultCard /> : null}
    </View>
  );
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const conversation = useConversation(conversationId);
  const remove = useDeleteConversation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState<{ question: string; answer: string } | null>(null);
  const [error, setError] = useState<unknown>(null);

  if (conversation.isPending) return <Skeleton height={300} />;
  if (conversation.isError) return <ErrorState onRetry={() => void conversation.refetch()} />;
  if (!conversation.data) {
    return (
      <Screen>
        <EmptyState
          icon={MessageCircle}
          title="Esta conversación ya no está"
          description="Puede que se haya borrado o que haya vencido su tiempo de guardado."
        />
      </Screen>
    );
  }

  const c = conversation.data;
  const send = () => {
    const text = question.trim();
    if (!text || pending) return;
    setQuestion('');
    setError(null);
    setPending({ question: text, answer: '' });
    void sendQuestion(conversationId, text, (event) => {
      if (event.type === 'delta') {
        setPending((p) => (p ? { ...p, answer: p.answer + event.text } : p));
        scroll.current?.scrollToEnd({ animated: true });
      }
    })
      .catch((e: unknown) => {
        setError(e);
        setQuestion(text);
      })
      .finally(() => {
        void queryClient
          .invalidateQueries({ queryKey: assistantKeys.conversation(conversationId) })
          .then(() => {
            setPending(null);
            void queryClient.invalidateQueries({ queryKey: ['assistant'] });
          });
      });
  };

  return (
    <Screen scroll={false}>
      {/* Todo se desplaza menos la pregunta, que queda siempre a mano abajo (en el celular el
          encabezado fijo dejaba muy poco lugar para leer la respuesta). */}
      <ScrollView
        ref={scroll}
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        onLayout={() => scroll.current?.scrollToEnd({ animated: false })}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        <Text variant="heading">{c.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Clock size={14} color={colors.inkMuted} aria-hidden />
          <Text variant="small" tone="muted" style={{ flexShrink: 1 }}>
            {retentionLabel(c.expires_at)}
            {c.use_personal_context ? ' Usa el contexto de la familia.' : ''}
          </Text>
          <ConfirmAction
            label="Borrar conversación"
            confirmLabel="Sí, borrar"
            description="Se borra ya, con todos sus mensajes. No se puede deshacer."
            loading={remove.isPending}
            onConfirm={() => {
              remove.mutate(conversationId, {
                onSuccess: () => {
                  router.replace('/asistente');
                },
              });
            }}
          />
        </View>
        {c.messages.length === 0 && !pending ? (
          <Text tone="muted">
            Preguntá lo que necesites sobre pantallas, sueño, juego o rutinas. Por ejemplo: “Se pone
            muy mal cuando le apago la tablet, ¿qué hago?”.
          </Text>
        ) : null}
        {c.messages.map((m) => (
          <Message
            key={m.id}
            role={m.role}
            body={m.body}
            citations={m.citations}
            outcome={m.outcome}
            riskLevel={m.riskLevel}
            riskCategory={storedRiskCategory(m)}
          />
        ))}
        {pending ? (
          <>
            <UserBubble text={pending.question} />
            <AssistantBubble text={pending.answer} citations={[]} pending />
          </>
        ) : null}
      </ScrollView>

      {error ? <Banner tone="danger">{friendlyError(error)}</Banner> : null}
      <TextField
        label="Tu pregunta"
        value={question}
        onChangeText={setQuestion}
        multiline
        maxLength={ASSISTANT_QUESTION_MAX}
        editable={!pending}
        onSubmitEditing={send}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Button
          label="Enviar"
          icon={Send}
          loading={pending !== null}
          disabled={question.trim() === ''}
          onPress={send}
        />
        <Text variant="small" tone="muted" style={{ flexShrink: 1, flexBasis: 160, flexGrow: 1 }}>
          Orienta, no diagnostica. Si hay riesgo inmediato, llamá al 911.
        </Text>
      </View>
    </Screen>
  );
}
