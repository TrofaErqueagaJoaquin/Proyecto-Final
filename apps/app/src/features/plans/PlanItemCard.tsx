import { Link } from 'expo-router';
import { CircleCheck, RefreshCw, SkipForward } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  canManage,
  useActiveFamily,
  useMembers,
  usePreferences,
} from '@/features/families/queries';
import { ActivityIcon } from '@/features/library/activityVisuals';
import { useActivities } from '@/features/library/queries';
import { Badge, Banner, Button, Card, ChipGroup, Text } from '@/ui';

import {
  REASON_LABELS,
  toPlanActivities,
  useCompleteItem,
  useReplaceItem,
  useSkipItem,
  type PlanItemRow,
  type WeekPlan,
} from './queries';

const RATINGS = [
  { value: '1', label: 'No funcionó' },
  { value: '3', label: 'Más o menos' },
  { value: '5', label: '¡Nos encantó!' },
] as const;

const DAY = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric' });

export function dayLabel(isoDate: string): string {
  const text = DAY.format(new Date(`${isoDate}T12:00:00`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Una actividad del plan con "Hecho" (participantes y valoración), "Otra idea" y "Saltear". */
export function PlanItemCard({
  item,
  plan,
  showDay = true,
}: {
  item: PlanItemRow;
  plan: WeekPlan;
  showDay?: boolean;
}) {
  const { family } = useActiveFamily();
  const members = useMembers(family?.id);
  const preferences = usePreferences(family?.id);
  const activities = useActivities();
  const complete = useCompleteItem();
  const replace = useReplaceItem();
  const skip = useSkipItem();
  const [marking, setMarking] = useState(false);
  const [participants, setParticipants] = useState<string[]>(
    plan.member_id ? [plan.member_id] : [],
  );
  const [rating, setRating] = useState<string | null>(null);
  const [noAlternative, setNoAlternative] = useState(false);

  const manage = canManage(family?.role);
  const activeMembers = (members.data ?? []).filter((m) => m.archived_at === null);
  const done = item.status === 'done';
  const skipped = item.status === 'skipped';
  const error = complete.error ?? replace.error ?? skip.error;

  return (
    <Card>
      <Link href={`/actividades/${item.activity.slug}`} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={item.activity.title}
          style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
        >
          <ActivityIcon categories={item.activity.categories} />
          <View style={{ flex: 1, gap: 2 }}>
            {showDay ? (
              <Text variant="small" tone="muted">
                {dayLabel(item.scheduled_for)}
              </Text>
            ) : null}
            <Text variant="subheading">{item.activity.title}</Text>
            <Text variant="small" tone="muted">
              {`${String(item.activity.duration_min)} min · ${REASON_LABELS[item.reason]}`}
            </Text>
          </View>
        </Pressable>
      </Link>

      {done ? (
        <Badge tone="primary" icon={CircleCheck}>
          ¡Hecho!
        </Badge>
      ) : skipped ? (
        <Badge>Salteada</Badge>
      ) : marking ? (
        <View style={{ gap: 12 }}>
          {activeMembers.length > 0 ? (
            <ChipGroup
              multiple
              label="¿Quiénes participaron?"
              options={activeMembers.map((m) => ({ value: m.id, label: m.alias }))}
              value={participants}
              onChange={setParticipants}
            />
          ) : null}
          <ChipGroup
            label="¿Cómo les fue? (opcional)"
            options={RATINGS}
            value={rating as '1' | null}
            onChange={setRating}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              label="Registrar"
              loading={complete.isPending}
              onPress={() => {
                complete.mutate(
                  {
                    itemId: item.id,
                    memberIds: participants,
                    rating: rating === null ? null : Number(rating),
                  },
                  {
                    onSuccess: () => {
                      setMarking(false);
                    },
                  },
                );
              }}
            />
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={() => {
                setMarking(false);
              }}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label="Hecho"
            icon={CircleCheck}
            onPress={() => {
              setMarking(true);
            }}
          />
          {manage ? (
            <Button
              label="Otra idea"
              variant="secondary"
              icon={RefreshCw}
              loading={replace.isPending}
              disabled={!activities.data || preferences.isPending}
              onPress={() => {
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
                    },
                  },
                );
              }}
            />
          ) : null}
          <Button
            label="Saltear"
            variant="ghost"
            icon={SkipForward}
            loading={skip.isPending}
            onPress={() => {
              skip.mutate(item.id);
            }}
          />
        </View>
      )}
      {noAlternative ? (
        <Text variant="small" tone="muted">
          No encontramos otra actividad que entre en sus preferencias.
        </Text>
      ) : null}
      {error ? <Banner tone="danger">{friendlyError(error)}</Banner> : null}
    </Card>
  );
}
