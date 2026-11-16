import { CircleCheck, Clock, ListChecks } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { TextLink } from '@/features/auth/components';
import { feedback } from '@/features/feedback/feedback';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { useCompleteItem } from '@/features/plans/queries';
import { Banner, Button, ChipGroup, Text } from '@/ui';

import { useLogActivity, useSavedActivities, useToggleSaved } from './queries';

export const RATINGS = [
  { value: '1', label: 'No funcionó' },
  { value: '3', label: 'Más o menos' },
  { value: '5', label: '¡Nos encantó!' },
] as const;

/**
 * "Realizado" (registra que la hicieron) y "Hacer más tarde" (la deja en la lista "Para hacer" de
 * Hoy). Solo con sesión y familia.
 */
export function FamilyActivityActions({
  activityId,
  planItemId,
  onDone,
}: {
  activityId: string;
  /** Abierta desde el plan: se completa ese ítem en vez de un registro suelto. */
  planItemId?: string;
  onDone?: () => void;
}) {
  const auth = useAuth();
  const { family } = useActiveFamily();
  const saved = useSavedActivities(family?.id);
  const toggle = useToggleSaved(family?.id);
  const members = useMembers(family?.id);
  const logActivity = useLogActivity(family?.id);
  const completeItem = useCompleteItem();
  const log = planItemId ? completeItem : logActivity;
  const [logging, setLogging] = useState(false);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [rating, setRating] = useState<string | null>(null);

  if (auth.status !== 'signedIn') {
    return (
      <Text>
        <TextLink href="/ingresar">Ingresá</TextLink> para llevar registro de lo que hacen en
        familia.
      </Text>
    );
  }
  if (!family) return null;

  const isSaved = saved.data?.some((s) => s.activity_id === activityId) ?? false;
  const activeMembers = (members.data ?? []).filter((m) => m.archived_at === null);
  // Con un solo integrante, ya queda elegido.
  const participants = chosen ?? (activeMembers.length === 1 ? [activeMembers[0]!.id] : []);

  if (logging) {
    return (
      <View style={{ gap: 14 }}>
        {activeMembers.length > 1 ? (
          <ChipGroup
            multiple
            label="¿Quiénes participaron?"
            options={activeMembers.map((m) => ({ value: m.id, label: m.alias }))}
            value={participants}
            onChange={setChosen}
          />
        ) : null}
        <ChipGroup
          label="¿Cómo les fue? (opcional)"
          options={RATINGS}
          value={rating as '1' | null}
          onChange={setRating}
        />
        <Button
          label="Listo"
          icon={CircleCheck}
          fullWidth
          loading={log.isPending}
          onPress={() => {
            const input = {
              memberIds: participants,
              rating: rating === null ? null : Number(rating),
            };
            const after = {
              onSuccess: () => {
                feedback('done');
                setLogging(false);
                setChosen(null);
                setRating(null);
                onDone?.();
              },
            };
            if (planItemId) completeItem.mutate({ itemId: planItemId, ...input }, after);
            else logActivity.mutate({ activityId, ...input }, after);
          }}
        />
        <Button
          label="Cancelar"
          variant="ghost"
          onPress={() => {
            setLogging(false);
          }}
        />
        {log.error ? <Banner tone="danger">{friendlyError(log.error)}</Banner> : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Button
        label="Realizado"
        icon={CircleCheck}
        fullWidth
        onPress={() => {
          setLogging(true);
        }}
      />
      {canManage(family.role) ? (
        <Button
          label={isSaved ? 'En tu lista para hacer' : 'Hacer más tarde'}
          variant="secondary"
          icon={isSaved ? ListChecks : Clock}
          fullWidth
          loading={toggle.isPending}
          onPress={() => {
            feedback('tap');
            toggle.mutate({ activityId, saved: isSaved });
          }}
        />
      ) : null}
      {toggle.error ? <Banner tone="danger">{friendlyError(toggle.error)}</Banner> : null}
    </View>
  );
}
