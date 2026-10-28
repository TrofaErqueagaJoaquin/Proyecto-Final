import { Redirect } from 'expo-router';
import { Target } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
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
  Banner,
  Button,
  Card,
  ChipGroup,
  EmptyState,
  ErrorState,
  GrowthLine,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

const FAMILY = 'familia';
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const SOURCE_LABELS: Record<GoalRow['source'], string> = {
  family: 'De la familia',
  recommendation: 'Desde una recomendación',
  professional: 'Propuesto por un profesional',
};
const STATUS_OPTIONS = (Object.keys(GOAL_STATUS_LABELS) as GoalStatus[]).map((value) => ({
  value,
  label: GOAL_STATUS_LABELS[value],
}));
const PROGRESS_OPTIONS = [
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '100', label: '¡Logrado!' },
] as const;

function GoalCard({ goal, who, manage }: { goal: GoalRow; who: string; manage: boolean }) {
  const add = useAddProgress();
  const setStatus = useSetGoalStatus();
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const percent = latestProgress(goal);

  return (
    <Card>
      <Text variant="subheading">{goal.title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Badge>{who}</Badge>
        <Badge tone={goal.status === 'achieved' ? 'primary' : 'neutral'}>
          {GOAL_STATUS_LABELS[goal.status]}
        </Badge>
        <Badge>{SOURCE_LABELS[goal.source]}</Badge>
      </View>
      {goal.description ? <Text>{goal.description}</Text> : null}
      {percent !== null ? (
        <GrowthLine progress={percent / 100} label={`Avance: ${String(percent)}%`} />
      ) : null}
      {goal.progress.slice(0, 3).map((p) => (
        <Text key={p.id} variant="small" tone="muted">
          {`${DATE.format(new Date(p.recorded_at))}: ${p.note}`}
        </Text>
      ))}

      {manage && goal.status === 'active' ? (
        <View style={{ gap: 8 }}>
          <TextField
            label="Anotar un avance"
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
          <Button
            label="Guardar avance"
            variant="secondary"
            disabled={note.trim() === ''}
            loading={add.isPending}
            onPress={() => {
              add.mutate(
                {
                  goalId: goal.id,
                  note: note.trim(),
                  progress: progress === null ? null : Number(progress),
                },
                {
                  onSuccess: () => {
                    if (progress === '100')
                      setStatus.mutate({ goalId: goal.id, status: 'achieved' });
                    setNote('');
                    setProgress(null);
                  },
                },
              );
            }}
          />
        </View>
      ) : null}
      {manage ? (
        <ChipGroup
          label="Estado"
          options={STATUS_OPTIONS}
          value={goal.status}
          onChange={(status) => {
            setStatus.mutate({ goalId: goal.id, status });
          }}
        />
      ) : null}
      {(add.error ?? setStatus.error) ? (
        <Banner tone="danger">{friendlyError(add.error ?? setStatus.error)}</Banner>
      ) : null}
    </Card>
  );
}

function NewGoal({
  familyId,
  options,
}: {
  familyId: string;
  options: { value: string; label: string }[];
}) {
  const create = useCreateGoal(familyId);
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState(FAMILY);
  return (
    <Card>
      <Text variant="subheading">Nuevo objetivo</Text>
      <TextField
        label="¿Qué quieren lograr?"
        placeholder="Por ejemplo: apagar las pantallas una hora antes de dormir"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <ChipGroup label="¿Para quién?" options={options} value={about} onChange={setAbout} />
      {create.error ? <Banner tone="danger">{friendlyError(create.error)}</Banner> : null}
      <Button
        label="Crear objetivo"
        disabled={title.trim().length < 3}
        loading={create.isPending}
        onPress={() => {
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
                setTitle('');
              },
            },
          );
        }}
      />
    </Card>
  );
}

/** Objetivos de seguimiento con su avance (F7). */
export default function GoalsScreen() {
  const { isPending, family } = useActiveFamily();
  const members = useMembers(family?.id);
  const goals = useGoals(family?.id);

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;

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

  return (
    <Screen>
      <Text variant="title">Objetivos</Text>
      <Text tone="muted">
        Pocos y concretos funcionan mejor. Anoten los avances aunque sean chicos.
      </Text>
      {manage ? <NewGoal familyId={family.id} options={options} /> : null}

      {goals.isPending ? (
        <Skeleton height={200} />
      ) : goals.isError ? (
        <ErrorState onRetry={() => void goals.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Todavía no hay objetivos"
          description="Pueden crear uno acá o convertir una recomendación de la evaluación en objetivo."
        />
      ) : (
        <>
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} who={who(g.member_id)} manage={manage} />
          ))}
          {closed.length > 0 ? <Text variant="heading">Cerrados</Text> : null}
          {closed.map((g) => (
            <GoalCard key={g.id} goal={g} who={who(g.member_id)} manage={manage} />
          ))}
        </>
      )}
    </Screen>
  );
}
