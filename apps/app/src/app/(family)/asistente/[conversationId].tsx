import type { AssistantCitation, AssistantMessage } from '@crecer/shared';
import { ASSISTANT_QUESTION_MAX } from '@crecer/shared';
import { RISK_RESPONSES, type HighRiskCategory } from '@crecer/domain';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, MoreHorizontal, Send, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  View,
  type ScrollViewInstance,
  type TextInputKeyPressEvent,
} from 'react-native';

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
import { BroteEmptyState, BroteSays } from '@/features/brote/Brote';
import {
  Button,
  ErrorBanner,
  ErrorScreen,
  LoadingScreen,
  Screen,
  Sheet,
  Text,
  TextField,
  useOverlayTurn,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

/** La respuesta fija guardada empieza con el título de su categoría: así se vuelve a mostrar la tarjeta. */
function storedRiskCategory(message: StoredMessage): HighRiskCategory | null {
  if (message.outcome !== 'risk_redirect') return null;
  const entry = (Object.entries(RISK_RESPONSES) as [HighRiskCategory, { title: string }][]).find(
    ([, response]) => message.body.startsWith(response.title),
  );
  return entry?.[0] ?? null;
}

/** La primera pregunta llega desde la pantalla del asistente por la caché (ver `asistente/index`). */
const firstQuestionKey = (conversationId: string) => ['asistente-primera-pregunta', conversationId];

/** En la web, Enter envía y Shift+Enter baja de renglón: ¿hay que enviar con esta tecla? */
function isEnterToSend(event: TextInputKeyPressEvent): boolean {
  const native = event.nativeEvent as { key: string; shiftKey?: boolean };
  if (native.key !== 'Enter' || native.shiftKey === true) return false;
  event.preventDefault();
  return true;
}

function retentionLabel(expiresAt: string): string {
  const hours = (new Date(expiresAt).getTime() - Date.now()) / 3_600_000;
  if (hours <= 48) return 'Esta conversación se borra en 24 horas.';
  return `Esta conversación se borra en ${String(Math.round(hours / 24))} días.`;
}

/**
 * Menú "…" de la conversación: lo que se usa poco (borrarla) queda guardado acá y no arriba de
 * todo. Borrar pide confirmación en la misma ventana.
 */
function ConversationMenu({ loading, onDelete }: { loading: boolean; onDelete: () => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<'menu' | 'confirm' | null>(null);
  const id = useId();
  const visible = useOverlayTurn(`conversacion-menu-${id}`, open !== null);
  const wasLoading = useRef(false);
  // Al terminar de borrar, la ventana se cierra sola.
  useEffect(() => {
    if (wasLoading.current && !loading) setOpen(null);
    wasLoading.current = loading;
  }, [loading]);
  const close = () => {
    if (!loading) setOpen(null);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Más opciones"
        hitSlop={4}
        style={{
          width: minTouchTarget,
          height: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={() => {
          setOpen('menu');
        }}
      >
        <MoreHorizontal size={24} color={colors.ink} aria-hidden />
      </Pressable>
      <Sheet
        visible={visible}
        onClose={close}
        title={open === 'confirm' ? '¿Borrar la conversación?' : 'Más opciones'}
      >
        {open === 'confirm' ? (
          <>
            <Text>Se borra ya, con todos sus mensajes. No se puede deshacer.</Text>
            <Button
              label="Sí, borrar"
              variant="danger"
              icon={Trash2}
              loading={loading}
              fullWidth
              onPress={onDelete}
            />
            <Button
              label="Cancelar"
              variant="secondary"
              disabled={loading}
              fullWidth
              onPress={close}
            />
          </>
        ) : (
          <Button
            label="Borrar conversación"
            variant="dangerSoft"
            icon={Trash2}
            fullWidth
            onPress={() => {
              setOpen('confirm');
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function Message({
  role,
  body,
  citations,
  outcome,
  riskLevel,
  riskCategory,
  rehearsal,
}: {
  role: 'user' | 'assistant';
  body: string;
  citations: AssistantCitation[];
  outcome: AssistantMessage['outcome'] | null;
  riskLevel: 'none' | 'clinical' | 'high' | null;
  riskCategory: HighRiskCategory | null;
  rehearsal: boolean;
}) {
  if (role === 'user') return <UserBubble text={body} />;
  if (outcome === 'risk_redirect' && riskCategory) return <RiskCard category={riskCategory} />;
  return (
    <View style={{ gap: 8 }}>
      <AssistantBubble text={body} citations={citations} rehearsal={rehearsal} />
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
  // Si se llegó preguntando desde el asistente, la primera pregunta ya se muestra enviándose.
  const [first] = useState(() =>
    queryClient.getQueryData<string>(firstQuestionKey(conversationId)),
  );
  const [pending, setPending] = useState<{ question: string; answer: string } | null>(
    first ? { question: first, answer: '' } : null,
  );
  const firstSent = useRef(false);
  // El error del envío guarda la pregunta que falló: "Reintentar" la manda igual.
  const [failed, setFailed] = useState<{ error: unknown; text: string } | null>(null);

  // Manda la pregunta y va mostrando la respuesta (los cambios de estado llegan después).
  const stream = useCallback(
    (text: string) => {
      void sendQuestion(conversationId, text, (event) => {
        if (event.type === 'delta') {
          setPending((p) => (p ? { ...p, answer: p.answer + event.text } : p));
          scroll.current?.scrollToEnd({ animated: true });
        }
      })
        .catch((e: unknown) => {
          setFailed({ error: e, text });
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
    },
    [conversationId, queryClient],
  );
  const send = (retryText?: string) => {
    const text = (retryText ?? question).trim();
    if (!text || pending) return;
    setQuestion('');
    setFailed(null);
    setPending({ question: text, answer: '' });
    stream(text);
  };

  // La pregunta que llegó desde el asistente sale sola, una sola vez.
  const empty = conversation.data?.messages.length === 0;
  useEffect(() => {
    if (!first || !empty || firstSent.current) return;
    firstSent.current = true;
    queryClient.removeQueries({ queryKey: firstQuestionKey(conversationId), exact: true });
    stream(first);
  }, [first, empty, conversationId, queryClient, stream]);

  if (conversation.isPending) return <LoadingScreen />;
  if (conversation.isError) {
    return (
      <ErrorScreen
        error={conversation.error}
        onRetry={() => void conversation.refetch()}
        secondaryAction={{ label: 'Ir al asistente', onPress: () => router.replace('/asistente') }}
      />
    );
  }
  if (!conversation.data) {
    return (
      <Screen>
        <BroteEmptyState
          title="Esta conversación ya no está"
          description="Se borró o venció su tiempo de guardado."
          action={<Button label="Ir al asistente" onPress={() => router.replace('/asistente')} />}
        />
      </Screen>
    );
  }

  const c = conversation.data;

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="heading" style={{ flex: 1 }}>
            {c.title}
          </Text>
          <ConversationMenu
            loading={remove.isPending}
            onDelete={() => {
              remove.mutate(conversationId, {
                onSuccess: () => {
                  router.replace('/asistente');
                },
              });
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Clock size={14} color={colors.inkMuted} aria-hidden />
          <Text variant="small" tone="muted" style={{ flexShrink: 1 }}>
            {retentionLabel(c.expires_at)}
            {c.use_personal_context ? ' Conoce a tu familia.' : ''}
          </Text>
        </View>
        {c.messages.length === 0 && !pending ? (
          <BroteSays size={88}>¿Qué te preocupa? Contámelo con tus palabras.</BroteSays>
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
            rehearsal={m.rehearsal}
          />
        ))}
        {pending ? (
          <>
            <UserBubble text={pending.question} />
            <AssistantBubble text={pending.answer} citations={[]} pending />
          </>
        ) : null}
      </ScrollView>

      <ErrorBanner error={remove.error} />
      <ErrorBanner
        error={failed?.error}
        retryLoading={pending !== null}
        onRetry={() => {
          if (failed) send(failed.text);
        }}
      />
      {/* El botón queda pegado al campo para enviar sin buscarlo. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Tu pregunta"
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={ASSISTANT_QUESTION_MAX}
            editable={!pending}
            onKeyPress={
              Platform.OS === 'web'
                ? (event) => {
                    if (isEnterToSend(event)) send();
                  }
                : undefined
            }
          />
        </View>
        <Button
          label="Enviar"
          icon={Send}
          loading={pending !== null}
          disabled={question.trim() === ''}
          onPress={() => {
            send();
          }}
        />
      </View>
      <Text variant="small" tone="muted">
        Orienta, no diagnostica. Si hay riesgo inmediato, llamá al 911.
      </Text>
    </Screen>
  );
}
