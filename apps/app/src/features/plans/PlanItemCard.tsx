import { CircleCheck, Ellipsis, PlayCircle, RefreshCw, SkipForward } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ActivityScene, sceneFor } from '@/features/animations';
import {
  canManage,
  useActiveFamily,
  useMembers,
  usePreferences,
} from '@/features/families/queries';
import { useActivityFlow } from '@/features/library/ActivityFlow';
import { DoneForm } from '@/features/library/FamilyActivityActions';
import { useActivities } from '@/features/library/queries';
import { Badge, Button, Card, ErrorBanner, Sheet, Text, useOverlayTurn, useTheme } from '@/ui';

import {
  REASON_LABELS,
  toPlanActivities,
  useReplaceItem,
  useSkipItem,
  type PlanItemRow,
  type WeekPlan,
} from './queries';

/** Cuánto dura "Salteada · Deshacer" antes de guardarse. */
const UNDO_MS = 5000;

const DAY = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric' });

export function dayLabel(isoDate: string): string {
  const text = DAY.format(new Date(`${isoDate}T12:00:00`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * "Saltear" con unos segundos para deshacer: se guarda al terminar el tiempo (o al salir de la
 * pantalla), así no hace falta volver atrás en la base.
 */
function useSkipWithUndo(itemId: string) {
  const skip = useSkipItem();
  const skipNow = skip.mutate;
  const [waiting, setWaiting] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    if (!waiting) return;
    pending.current = true;
    const commit = () => {
      if (!pending.current) return;
      pending.current = false;
      skipNow(itemId);
    };
    const timer = setTimeout(() => {
      commit();
      setWaiting(false);
    }, UNDO_MS);
    return () => {
      clearTimeout(timer);
      commit();
    };
  }, [waiting, itemId, skipNow]);

  return {
    waiting,
    saving: skip.isPending,
    error: skip.error,
    start: () => {
      setWaiting(true);
    },
    undo: () => {
      pending.current = false;
      setWaiting(false);
    },
  };
}

/**
 * Una actividad del plan: dibujo, título y un solo "Realizado". Tocarla abre cómo se hace;
 * "Otra idea" y "Saltear" quedan en la ventana de "Más opciones".
 */
export function PlanItemCard({
  item,
  plan,
  showDay = true,
  next,
}: {
  item: PlanItemRow;
  plan: WeekPlan;
  showDay?: boolean;
  /**
   * En la lista del plan: `true` marca "Lo que sigue"; `false` deja "Realizado" como botón
   * secundario para que se note cuál sigue. Sin indicar (Hoy), "Realizado" es el principal.
   */
  next?: boolean;
}) {
  const { colors } = useTheme();
  const { family } = useActiveFamily();
  const members = useMembers(family?.id);
  const preferences = usePreferences(family?.id);
  const activities = useActivities();
  const replace = useReplaceItem();
  const skip = useSkipWithUndo(item.id);
  const flow = useActivityFlow();
  const [marking, setMarking] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsVisible = useOverlayTurn(`plan-opciones-${item.id}`, optionsOpen);
  const [noAlternative, setNoAlternative] = useState(false);

  const manage = canManage(family?.role);
  const activeMembers = (members.data ?? []).filter((m) => m.archived_at === null);
  const done = item.status === 'done';
  const skipped = item.status === 'skipped' || skip.saving;

  const otherIdea = () => {
    const p = preferences.data;
    replace.mutate(
      {
        itemId: item.id,
        plan,
        activities: toPlanActivities(activities.data ?? []),
        preferences: {
          minutesPerDay: p?.minutes_per_day ?? null,
          space: (p?.space ?? null) as 'indoor' | null,
          budget: (p?.budget ?? null) as 'free' | null,
          interests: p?.interests ?? [],
        },
        birthMonths: activeMembers
          .filter((m) => plan.member_id === null || m.id === plan.member_id)
          .map((m) => m.birth_month),
      },
      {
        onSuccess: (changed) => {
          setNoAlternative(!changed);
          if (changed) setOptionsOpen(false);
        },
      },
    );
  };

  return (
    <Card>
      {next === true && !done && !skipped ? (
        <Badge tone="primary" icon={PlayCircle}>
          Lo que sigue
        </Badge>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.activity.title}: ver cómo se hace`}
        onPress={() => {
          // Si sigue pendiente, "Realizado" en la ventana completa este ítem del plan.
          flow.open(item.activity.slug, item.activity.title, {
            planItemId: item.status === 'planned' && manage ? item.id : undefined,
          });
        }}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48 }}
      >
        <ActivityScene
          scene={sceneFor(item.activity.slug, item.activity.categories)}
          width={104}
          label=""
        />
        <View style={{ flex: 1, gap: 4 }}>
          {showDay ? (
            <Text variant="small" tone="muted">
              {dayLabel(item.scheduled_for)}
            </Text>
          ) : null}
          <Text variant="subheading">{item.activity.title}</Text>
          <Text variant="small" tone="muted">
            {`${String(item.activity.duration_min)} min · ${REASON_LABELS[item.reason]}`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PlayCircle size={18} color={colors.primary} aria-hidden />
            <Text variant="bodyStrong" tone="primary">
              Ver cómo se hace
            </Text>
          </View>
        </View>
      </Pressable>

      {done ? (
        <Badge tone="primary" icon={CircleCheck}>
          ¡Realizado!
        </Badge>
      ) : skip.waiting ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
          accessibilityLiveRegion="polite"
        >
          <Text tone="muted">Salteada</Text>
          <Button label="Deshacer" variant="secondary" onPress={skip.undo} />
        </View>
      ) : skipped ? (
        <Badge>Salteada</Badge>
      ) : marking ? (
        <DoneForm
          activityId={item.activity.id}
          planItemId={item.id}
          defaultMemberIds={plan.member_id ? [plan.member_id] : undefined}
          onDone={() => {
            setMarking(false);
            flow.celebrate({
              id: item.activity.id,
              slug: item.activity.slug,
              title: item.activity.title,
            });
          }}
          onCancel={() => {
            setMarking(false);
          }}
        />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <View style={{ flexGrow: 1 }}>
            <Button
              label="Realizado"
              icon={CircleCheck}
              variant={next === false ? 'secondary' : 'primary'}
              fullWidth
              onPress={() => {
                setMarking(true);
              }}
            />
          </View>
          {manage ? (
            <Button
              label="Más opciones"
              variant="ghost"
              icon={Ellipsis}
              onPress={() => {
                setNoAlternative(false);
                setOptionsOpen(true);
              }}
            />
          ) : null}
        </View>
      )}
      <ErrorBanner error={skip.error} />

      <Sheet
        visible={optionsVisible}
        title={item.activity.title}
        onClose={() => {
          setOptionsOpen(false);
        }}
      >
        <View style={{ gap: 12 }}>
          <Button
            label="Otra idea"
            icon={RefreshCw}
            fullWidth
            loading={replace.isPending}
            disabled={!activities.data || preferences.isPending}
            onPress={otherIdea}
          />
          {noAlternative ? (
            <Text tone="muted">No encontramos otra que entre en sus preferencias.</Text>
          ) : null}
          <Button
            label="Saltear esta vez"
            variant="secondary"
            icon={SkipForward}
            fullWidth
            onPress={() => {
              setOptionsOpen(false);
              skip.start();
            }}
          />
          <ErrorBanner error={replace.error} />
        </View>
      </Sheet>
    </Card>
  );
}
