import { Redirect } from 'expo-router';
import {
  ChevronRight,
  CirclePause,
  CirclePlay,
  PencilLine,
  Plus,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BroteEmptyState } from '@/features/brote/Brote';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { feedback } from '@/features/feedback/feedback';
import { useFieldErrors } from '@/features/forms/useFieldErrors';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import {
  latestProgress,
  useAddProgress,
  useCreateGoal,
  useGoals,
  useSetGoalStatus,
  type GoalRow,
} from '@/features/goals/queries';
import { GOAL_STATUS_LABELS, type GoalStatus } from '@/features/professionals/labels';
import {
  Badge,
  Button,
  ChipGroup,
  ConfirmAction,
  Disclosure,
  ErrorBanner,
  ErrorState,
  GrowthLine,
  LoadingScreen,
  makeStyles,
  Screen,
  Sheet,
  Skeleton,
  Text,
  TextField,
  useOverlayTurn,
  useTheme,
} from '@/ui';

const FAMILY = 'familia';
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const PROGRESS_OPTIONS = [
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '100', label: '¡Logrado!' },
] as const;
/** Lo que tarda la ventana en cerrarse antes de abrir el festejo (dos ventanas a la vez fallan en iOS). */
const AFTER_SHEET_MS = 400;

const useStyles = makeStyles((t) => ({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    minHeight: 72,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: t.space.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
}));

/** Tarjeta simple de un objetivo: al tocarla abre la ventana con el detalle y las acciones. */
function GoalTile({ goal, who, onPress }: { goal: GoalRow; who: string; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const percent = latestProgress(goal);
  const achieved = goal.status === 'achieved';
  const Icon = achieved ? Trophy : Target;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}. ${who}. ${GOAL_STATUS_LABELS[goal.status]}${
        percent === null ? '' : `, avance ${String(percent)}%`
      }`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View
        style={[styles.icon, { backgroundColor: achieved ? colors.sunSoft : colors.primarySoft }]}
      >
        <Icon color={achieved ? colors.ink : colors.primary} size={24} aria-hidden />
      </View>
      <View style={styles.body}>
        <Text variant="subheading">{goal.title}</Text>
        <View style={styles.badges}>
          <Badge>{who}</Badge>
          {goal.status === 'active' ? null : (
            <Badge tone={achieved ? 'primary' : 'neutral'}>{GOAL_STATUS_LABELS[goal.status]}</Badge>
          )}
        </View>
        {percent !== null && goal.status !== 'achieved' ? (
          <GrowthLine progress={percent / 100} label={`Avance: ${String(percent)}%`} />
        ) : null}
      </View>
      <ChevronRight color={colors.inkMuted} size={24} aria-hidden />
    </Pressable>
  );
}

/** "Anotar avance": qué hicieron y, si quieren, cuánto avanzaron. */
function ProgressForm({
  goal,
  onSaved,
  onCancel,
}: {
  goal: GoalRow;
  onSaved: (achieved: boolean) => void;
  onCancel: () => void;
}) {
  const add = useAddProgress();
  const setStatus = useSetGoalStatus();
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const save = () => {
    if (!fields.attempt()) return;
    add.mutate(
      { goalId: goal.id, note: note.trim(), progress: progress === null ? null : Number(progress) },
      {
        onSuccess: () => {
          if (progress === '100') {
            setStatus.mutate(
              { goalId: goal.id, status: 'achieved' },
              {
                onSuccess: () => {
                  onSaved(true);
                },
              },
            );
          } else onSaved(false);
        },
      },
    );
  };
  const fields = useFieldErrors(
    { note: note.trim() === '' ? 'Contá en pocas palabras qué hicieron.' : undefined },
    { onSubmit: save },
  );
  return (
    <View style={{ gap: 14 }}>
      <TextField
        {...fields.field('note')}
        label="¿Qué hicieron?"
        placeholder="Por ejemplo: tres cenas sin tele"
        value={note}
        onChangeText={setNote}
        maxLength={500}
      />
      <ChipGroup
        label="¿Cuánto avanzaron? (opcional)"
        options={PROGRESS_OPTIONS}
        value={progress as '25' | null}
        onChange={(value) => {
          setProgress(progress === value ? null : value);
        }}
      />
      <ErrorBanner error={add.error ?? setStatus.error} />
      <Button
        label="Guardar avance"
        icon={PencilLine}
        fullWidth
        loading={add.isPending || setStatus.isPending}
        onPress={save}
      />
      <Button label="Cancelar" variant="ghost" fullWidth onPress={onCancel} />
    </View>
  );
}

/** Cambiar el estado: lo habitual a la vista y "Dejar de lado" con confirmación. */
function StatusActions({
  goal,
  onAchieved,
  onChanged,
}: {
  goal: GoalRow;
  onAchieved: () => void;
  onChanged: () => void;
}) {
  const setStatus = useSetGoalStatus();
  const change = (status: GoalStatus) => {
    setStatus.mutate(
      { goalId: goal.id, status },
      {
        onSuccess: () => {
          if (status === 'achieved') onAchieved();
          else {
            feedback('tap');
            onChanged();
          }
        },
      },
    );
  };
  const open = goal.status === 'active' || goal.status === 'paused';
  return (
    <View style={{ gap: 10 }}>
      {open ? (
        <Button
          label="¡Lo logramos!"
          icon={Trophy}
          variant="secondary"
          fullWidth
          loading={setStatus.isPending && setStatus.variables?.status === 'achieved'}
          onPress={() => {
            change('achieved');
          }}
        />
      ) : null}
      {goal.status === 'active' ? (
        <Button
          label="Poner en pausa"
          icon={CirclePause}
          variant="ghost"
          fullWidth
          onPress={() => {
            change('paused');
          }}
        />
      ) : null}
      {goal.status === 'paused' ? (
        <Button
          label="Retomar"
          icon={CirclePlay}
          variant="ghost"
          fullWidth
          onPress={() => {
            change('active');
          }}
        />
      ) : null}
      {open ? (
        <ConfirmAction
          label="Dejar de lado"
          icon={XCircle}
          title="¿Dejar de lado este objetivo?"
          description="Pasa a la lista de cerrados. Pueden retomarlo cuando quieran."
          confirmLabel="Dejar de lado"
          loading={setStatus.isPending && setStatus.variables?.status === 'dropped'}
          onConfirm={() => {
            change('dropped');
          }}
        />
      ) : (
        <Button
          label="Volver a intentarlo"
          icon={RotateCcw}
          variant="ghost"
          fullWidth
          onPress={() => {
            change('active');
          }}
        />
      )}
      <ErrorBanner error={setStatus.error} />
    </View>
  );
}

/** Ventana de un objetivo: avances recientes y, para quien administra, las acciones. */
function GoalSheet({
  goal,
  who,
  manage,
  onClose,
  onAchieved,
}: {
  goal: GoalRow | null;
  who: string;
  manage: boolean;
  onClose: () => void;
  onAchieved: () => void;
}) {
  // Se guarda de qué objetivo es el formulario: al abrir otro, arranca en el detalle.
  const [writingId, setWritingId] = useState<string | null>(null);
  const writing = goal !== null && writingId === goal.id;
  const setWriting = (on: boolean) => {
    setWritingId(on && goal ? goal.id : null);
  };

  return (
    <Sheet visible={goal !== null} onClose={onClose} title={goal?.title}>
      {goal === null ? null : writing ? (
        <ProgressForm
          goal={goal}
          onCancel={() => {
            setWriting(false);
          }}
          onSaved={(achieved) => {
            if (achieved) onAchieved();
            else {
              feedback('done');
              setWriting(false);
            }
          }}
        />
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Badge>{who}</Badge>
            <Badge tone={goal.status === 'achieved' ? 'primary' : 'neutral'}>
              {GOAL_STATUS_LABELS[goal.status]}
            </Badge>
            {goal.source === 'professional' ? <Badge>Propuesto por un profesional</Badge> : null}
          </View>
          {goal.description ? <Text>{goal.description}</Text> : null}
          {latestProgress(goal) !== null ? (
            <GrowthLine
              progress={(latestProgress(goal) ?? 0) / 100}
              label={`Avance: ${String(latestProgress(goal))}%`}
            />
          ) : null}
          {goal.progress.slice(0, 3).map((p) => (
            <Text key={p.id} variant="small" tone="muted">
              {`${DATE.format(new Date(p.recorded_at))}: ${p.note}`}
            </Text>
          ))}
          {manage && goal.status === 'active' ? (
            <Button
              label="Anotar avance"
              icon={PencilLine}
              fullWidth
              onPress={() => {
                setWriting(true);
              }}
            />
          ) : null}
          {manage ? (
            <StatusActions goal={goal} onAchieved={onAchieved} onChanged={onClose} />
          ) : null}
        </View>
      )}
    </Sheet>
  );
}

/** "Nuevo objetivo", en una ventana. */
function NewGoalSheet({
  visible,
  familyId,
  options,
  onClose,
}: {
  visible: boolean;
  familyId: string;
  options: { value: string; label: string }[];
  onClose: () => void;
}) {
  const create = useCreateGoal(familyId);
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState(FAMILY);
  const submit = () => {
    if (!fields.attempt()) return;
    create.mutate(
      {
        title: title.trim(),
        description: null,
        memberId: about === FAMILY ? null : about,
        source: 'family',
        targetDate: null,
      },
      {
        onSuccess: () => {
          feedback('done');
          setTitle('');
          setAbout(FAMILY);
          fields.reset();
          onClose();
        },
      },
    );
  };
  const fields = useFieldErrors(
    {
      title:
        title.trim().length < 3
          ? 'Contá en pocas palabras qué quieren lograr (al menos 3 letras).'
          : undefined,
    },
    { onSubmit: submit },
  );
  return (
    <Sheet visible={visible} onClose={onClose} title="Nuevo objetivo">
      <TextField
        {...fields.field('title')}
        label="¿Qué quieren lograr?"
        placeholder="Por ejemplo: apagar las pantallas una hora antes de dormir"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      {options.length > 1 ? (
        <ChipGroup label="¿Para quién?" options={options} value={about} onChange={setAbout} />
      ) : null}
      <ErrorBanner error={create.error} />
      <Button
        label="Crear objetivo"
        icon={Plus}
        fullWidth
        loading={create.isPending}
        onPress={submit}
      />
    </Sheet>
  );
}

/** Objetivos de seguimiento (F7): primero la lista; crear y anotar avances, en ventanas. */
export default function GoalsScreen() {
  const { isPending, family } = useActiveFamily();
  const members = useMembers(family?.id);
  const goals = useGoals(family?.id);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cheer, setCheer] = useState<string | null>(null);
  const cheerVisible = useOverlayTurn('objetivo-logrado', cheer !== null);

  if (isPending) return <LoadingScreen />;
  if (!family) return <Redirect href="/bienvenida" />;

  const manage = canManage(family.role);
  const options = [
    { value: FAMILY, label: 'Toda la familia' },
    ...(members.data ?? [])
      .filter((m) => m.archived_at === null)
      .map((m) => ({ value: m.id, label: m.alias })),
  ];
  const who = (memberId: string | null) =>
    memberId === null
      ? 'Toda la familia'
      : (members.data?.find((m) => m.id === memberId)?.alias ?? 'Integrante');
  const list = goals.data ?? [];
  const active = list.filter((g) => g.status === 'active' || g.status === 'paused');
  const closed = list.filter((g) => g.status === 'achieved' || g.status === 'dropped');
  const opened = list.find((g) => g.id === openId) ?? null;

  const newGoalButton = manage ? (
    <Button
      label="Nuevo objetivo"
      icon={Plus}
      fullWidth
      onPress={() => {
        setCreating(true);
      }}
    />
  ) : null;

  return (
    <Screen>
      <Text variant="title">Objetivos</Text>
      <Text tone="muted">Pocos y concretos funcionan mejor.</Text>

      {goals.isPending ? (
        <Skeleton height={200} />
      ) : goals.isError ? (
        <ErrorState error={goals.error} onRetry={() => void goals.refetch()} />
      ) : list.length === 0 ? (
        <BroteEmptyState
          mood="hola"
          title="Todavía no hay objetivos"
          description="Elijan algo chico para empezar."
          action={newGoalButton ?? undefined}
        />
      ) : (
        <>
          {active.map((g) => (
            <GoalTile
              key={g.id}
              goal={g}
              who={who(g.member_id)}
              onPress={() => {
                setOpenId(g.id);
              }}
            />
          ))}
          {active.length === 0 ? (
            <Text tone="muted">No hay objetivos en curso. ¿Proponen uno nuevo?</Text>
          ) : null}
          {newGoalButton}
          {closed.length > 0 ? (
            <Disclosure title={`Cerrados (${String(closed.length)})`}>
              <View style={{ gap: 12 }}>
                {closed.map((g) => (
                  <GoalTile
                    key={g.id}
                    goal={g}
                    who={who(g.member_id)}
                    onPress={() => {
                      setOpenId(g.id);
                    }}
                  />
                ))}
              </View>
            </Disclosure>
          ) : null}
        </>
      )}

      <GoalSheet
        goal={opened}
        who={opened ? who(opened.member_id) : ''}
        manage={manage}
        onClose={() => {
          setOpenId(null);
        }}
        onAchieved={() => {
          const title = opened?.title ?? '';
          setOpenId(null);
          setTimeout(() => {
            feedback('achievement');
            setCheer(title);
          }, AFTER_SHEET_MS);
        }}
      />
      {manage ? (
        <NewGoalSheet
          visible={creating}
          familyId={family.id}
          options={options}
          onClose={() => {
            setCreating(false);
          }}
        />
      ) : null}
      <GuidePopup
        visible={cheerVisible}
        celebrate
        title="¡Lo lograron!"
        message={cheer ?? undefined}
        primary={{
          label: 'Proponer otro',
          onPress: () => {
            setCheer(null);
            setTimeout(() => {
              setCreating(true);
            }, AFTER_SHEET_MS);
          },
        }}
        secondary={{
          label: '¡Genial!',
          onPress: () => {
            setCheer(null);
          },
        }}
        onClose={() => {
          setCheer(null);
        }}
      />
    </Screen>
  );
}
