import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Lock, ShieldCheck, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { BAND_LABELS } from '@/features/assessments/labels';
import { ageLabel, GOAL_STATUS_LABELS, type GoalStatus } from '@/features/professionals/labels';
import {
  proKeys,
  useAddGoalProgress,
  useMemberOverview,
  useProCases,
  useProposeGoal,
  useSaveObservation,
  useUpdateGoalStatus,
  type MemberOverview,
} from '@/features/professionals/queries';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  EmptyState,
  Screen,
  Skeleton,
  Text,
  TextField,
  useTheme,
} from '@/ui';

const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

const DIMENSION_TITLES: Record<string, string> = {
  sueno: 'Sueño',
  movimiento: 'Movimiento',
  pantalla_tiempo: 'Tiempo de pantalla',
  pantalla_contexto: 'Cómo se usan las pantallas',
  calma: 'Calma',
  acuerdos: 'Acuerdos',
};

const GOAL_STATUS_OPTIONS = (Object.keys(GOAL_STATUS_LABELS) as GoalStatus[]).map((value) => ({
  value,
  label: GOAL_STATUS_LABELS[value],
}));

type Tab = 'resumen' | 'evaluaciones' | 'objetivos' | 'observaciones';

function AssessmentsSection({ items }: { items: NonNullable<MemberOverview['assessments']> }) {
  if (items.length === 0) return <Text tone="muted">Todavía no hay evaluaciones enviadas.</Text>;
  return (
    <>
      {items.map((attempt) => (
        <Card key={attempt.id}>
          <Text variant="subheading">{DATE.format(new Date(attempt.submitted_at))}</Text>
          <Text variant="small" tone="muted">
            {`Edad al responder: ${ageLabel(attempt.member_age_months)}`}
          </Text>
          {(attempt.dimensions ?? []).map((d) => (
            <View
              key={d.code}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}
            >
              <Text>{DIMENSION_TITLES[d.code] ?? d.code}</Text>
              <Badge
                tone={
                  d.band === 'strength' ? 'primary' : d.band === 'watch' ? 'neutral' : 'caution'
                }
              >
                {BAND_LABELS[d.band]}
              </Badge>
            </View>
          ))}
        </Card>
      ))}
      <Text variant="small" tone="muted">
        Las bandas son orientativas: resumen hábitos que contó la familia, no son un diagnóstico.
      </Text>
    </>
  );
}

function GoalsSection({
  goals,
  assignmentId,
  memberId,
  familyId,
  onChanged,
}: {
  goals: NonNullable<MemberOverview['goals']>;
  assignmentId: string;
  memberId: string;
  familyId: string;
  onChanged: () => unknown;
}) {
  const propose = useProposeGoal(assignmentId, memberId, familyId);
  const progress = useAddGoalProgress(onChanged);
  const status = useUpdateGoalStatus(onChanged);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <>
      {goals.length === 0 ? <Text tone="muted">Todavía no hay objetivos.</Text> : null}
      {goals.map((g) => {
        const last = g.progress?.[0];
        return (
          <Card key={g.id}>
            <Text variant="subheading">{g.title}</Text>
            {g.description ? <Text>{g.description}</Text> : null}
            <Text variant="small" tone="muted">
              {`${g.source === 'professional' ? 'Propuesto por un profesional' : 'De la familia'}${
                last?.progress != null ? ` · ${String(last.progress)}%` : ''
              }`}
            </Text>
            <ChipGroup
              label="Estado"
              options={GOAL_STATUS_OPTIONS}
              value={g.status}
              onChange={(value) => {
                status.mutate({ goalId: g.id, status: value });
              }}
            />
            {(g.progress ?? []).slice(0, 3).map((entry) => (
              <Text key={entry.recorded_at} variant="small">
                {`${DATE.format(new Date(entry.recorded_at))}: ${entry.note}`}
              </Text>
            ))}
            <TextField
              label="Anotar un avance"
              value={notes[g.id] ?? ''}
              onChangeText={(text) => {
                setNotes({ ...notes, [g.id]: text });
              }}
              maxLength={500}
            />
            <Button
              label="Guardar avance"
              variant="secondary"
              disabled={(notes[g.id] ?? '').trim() === ''}
              loading={progress.isPending && progress.variables.goalId === g.id}
              onPress={() => {
                progress.mutate(
                  { goalId: g.id, note: (notes[g.id] ?? '').trim(), progress: null },
                  {
                    onSuccess: () => {
                      setNotes({ ...notes, [g.id]: '' });
                    },
                  },
                );
              }}
            />
          </Card>
        );
      })}
      {progress.error ? <Banner tone="danger">{friendlyError(progress.error)}</Banner> : null}
      {status.error ? <Banner tone="danger">{friendlyError(status.error)}</Banner> : null}
      <Card>
        <Text variant="subheading">Proponer un objetivo</Text>
        <TextField
          label="Objetivo"
          placeholder="Por ejemplo: hacer la tarea con el celular en otra habitación"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />
        <TextField
          label="Detalle (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={600}
        />
        {propose.error ? <Banner tone="danger">{friendlyError(propose.error)}</Banner> : null}
        <Button
          label="Proponer a la familia"
          loading={propose.isPending}
          disabled={title.trim().length < 3}
          onPress={() => {
            propose.mutate(
              { title: title.trim(), description: description.trim() || null },
              {
                onSuccess: () => {
                  setTitle('');
                  setDescription('');
                },
              },
            );
          }}
        />
      </Card>
    </>
  );
}

function ObservationsSection({
  items,
  assignmentId,
  memberId,
}: {
  items: NonNullable<MemberOverview['observations']>;
  assignmentId: string;
  memberId: string;
}) {
  const save = useSaveObservation(assignmentId, memberId);
  const { colors } = useTheme();
  const [body, setBody] = useState('');
  const [shared, setShared] = useState(false);

  return (
    <>
      <Card>
        <Text variant="subheading">Nueva observación</Text>
        <TextField
          label="Observación"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={4000}
        />
        <Checkbox
          checked={shared}
          onChange={setShared}
          label="Compartirla con la familia (si no, es solo para vos)"
        />
        {save.error ? <Banner tone="danger">{friendlyError(save.error)}</Banner> : null}
        <Button
          label="Guardar observación"
          loading={save.isPending}
          disabled={body.trim() === ''}
          onPress={() => {
            save.mutate(
              { body: body.trim(), visibility: shared ? 'shared_family' : 'private' },
              {
                onSuccess: () => {
                  setBody('');
                  setShared(false);
                },
              },
            );
          }}
        />
      </Card>
      {items.map((o) => (
        <Card key={o.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {o.visibility === 'private' ? (
              <Lock size={14} color={colors.inkMuted} aria-hidden />
            ) : (
              <Users size={14} color={colors.primary} aria-hidden />
            )}
            <Text variant="small" tone="muted">
              {`${o.mine ? 'Vos' : o.author_name} · ${DATE.format(new Date(o.created_at))} · ${
                o.visibility === 'private' ? 'Privada' : 'Compartida con la familia'
              }`}
            </Text>
          </View>
          <Text>{o.body}</Text>
          {o.mine ? (
            <Button
              label={o.visibility === 'private' ? 'Compartir con la familia' : 'Volver a privada'}
              variant="ghost"
              onPress={() => {
                save.mutate({
                  id: o.id,
                  body: o.body,
                  visibility: o.visibility === 'private' ? 'shared_family' : 'private',
                });
              }}
            />
          ) : null}
        </Card>
      ))}
    </>
  );
}

/**
 * Detalle de un integrante (UX §5.5). Lo que no está autorizado no aparece: ni deshabilitado.
 * Cada vez que se abre, la familia ve el acceso en su actividad.
 */
export default function MemberCaseScreen() {
  const { assignmentId, memberId } = useLocalSearchParams<{
    assignmentId: string;
    memberId: string;
  }>();
  const overview = useMemberOverview(assignmentId, memberId);
  const cases = useProCases();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('resumen');

  if (overview.isPending) {
    return (
      <Screen>
        <Skeleton height={40} width="50%" />
        <Skeleton height={200} />
      </Screen>
    );
  }
  if (overview.isError) {
    return (
      <Screen>
        <EmptyState
          icon={ShieldCheck}
          title="No tenés acceso a este integrante"
          description="Puede que la familia haya revocado el permiso o que el acompañamiento haya terminado."
        />
      </Screen>
    );
  }

  const o = overview.data;
  const familyCase = cases.data?.find((c) => c.id === assignmentId);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: proKeys.overview(assignmentId, memberId) });
  const tabs: { value: Tab; label: string }[] = [
    { value: 'resumen', label: 'Resumen' },
    ...(o.assessments ? [{ value: 'evaluaciones' as const, label: 'Evaluaciones' }] : []),
    ...(o.goals ? [{ value: 'objetivos' as const, label: 'Objetivos' }] : []),
    ...(o.observations ? [{ value: 'observaciones' as const, label: 'Observaciones' }] : []),
  ];

  return (
    <Screen>
      <Text variant="title">{o.member.alias}</Text>
      <Text tone="muted">
        {`${ageLabel(o.member.age_months)}${familyCase ? ` · ${familyCase.family_name}` : ''}`}
      </Text>
      <ChipGroup
        label="Sección"
        options={tabs}
        value={tab}
        onChange={(value) => {
          setTab(value);
        }}
      />

      {tab === 'resumen' ? (
        <Card>
          <Text variant="subheading">Lo que la familia compartió</Text>
          {o.member.interests.length > 0 ? (
            <Text>{`Le gusta: ${o.member.interests.join(', ')}`}</Text>
          ) : null}
          <Text>{`Evaluaciones: ${o.assessments ? String(o.assessments.length) : 'no compartidas'}`}</Text>
          <Text>{`Objetivos: ${o.goals ? String(o.goals.length) : 'no compartidos'}`}</Text>
          {o.activities ? (
            <>
              <Text variant="bodyStrong">Actividades recientes</Text>
              {o.activities.length === 0 ? <Text tone="muted">Todavía ninguna.</Text> : null}
              {o.activities.slice(0, 5).map((a) => (
                <Text key={`${a.title}-${a.done_on}`}>
                  {`${a.title} · ${DATE.format(new Date(`${a.done_on}T00:00:00`))}`}
                </Text>
              ))}
            </>
          ) : null}
          <Text variant="small" tone="muted">
            La familia ve cada vez que abrís este resumen.
          </Text>
        </Card>
      ) : null}
      {tab === 'evaluaciones' && o.assessments ? (
        <AssessmentsSection items={o.assessments} />
      ) : null}
      {tab === 'objetivos' && o.goals && familyCase ? (
        <GoalsSection
          goals={o.goals}
          assignmentId={assignmentId}
          memberId={memberId}
          familyId={familyCase.family_id}
          onChanged={refresh}
        />
      ) : null}
      {tab === 'observaciones' && o.observations ? (
        <ObservationsSection
          items={o.observations}
          assignmentId={assignmentId}
          memberId={memberId}
        />
      ) : null}
    </Screen>
  );
}
