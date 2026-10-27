import { Bookmark, BookmarkCheck, CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { TextLink } from '@/features/auth/components';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { Banner, Button, Card, ChipGroup, Text } from '@/ui';

import { useLogActivity, useSavedActivities, useToggleSaved } from './queries';

const RATINGS = [
  { value: '1', label: 'No funcionó' },
  { value: '3', label: 'Más o menos' },
  { value: '5', label: '¡Nos encantó!' },
] as const;

/** Guardar la actividad y registrar que la hicieron (solo con sesión y familia). */
export function FamilyActivityActions({ activityId }: { activityId: string }) {
  const auth = useAuth();
  const { family } = useActiveFamily();
  const saved = useSavedActivities(family?.id);
  const toggle = useToggleSaved(family?.id);
  const members = useMembers(family?.id);
  const log = useLogActivity(family?.id);
  const [logging, setLogging] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [rating, setRating] = useState<string | null>(null);

  if (auth.status !== 'signedIn') {
    return (
      <Card>
        <Text>
          <TextLink href="/ingresar">Ingresá</TextLink> para guardar actividades y llevar registro
          de lo que hacen en familia.
        </Text>
      </Card>
    );
  }
  if (!family) return null;

  const isSaved = saved.data?.some((s) => s.activity_id === activityId) ?? false;
  const activeMembers = (members.data ?? []).filter((m) => m.archived_at === null);

  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {canManage(family.role) ? (
          <Button
            label={isSaved ? 'Guardada' : 'Guardar'}
            variant="secondary"
            icon={isSaved ? BookmarkCheck : Bookmark}
            loading={toggle.isPending}
            onPress={() => {
              toggle.mutate({ activityId, saved: isSaved });
            }}
          />
        ) : null}
        {!logging ? (
          <Button
            label="La hicimos"
            icon={CircleCheck}
            onPress={() => {
              setLogging(true);
            }}
          />
        ) : null}
      </View>

      {logging ? (
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
          <Button
            label="Registrar"
            loading={log.isPending}
            onPress={() => {
              log.mutate(
                {
                  activityId,
                  memberIds: participants,
                  rating: rating === null ? null : Number(rating),
                },
                {
                  onSuccess: () => {
                    setLogging(false);
                    setParticipants([]);
                    setRating(null);
                  },
                },
              );
            }}
          />
        </View>
      ) : null}

      {log.isSuccess && !logging ? <Banner tone="success">¡Registrado! Bien ahí.</Banner> : null}
      {log.error ? <Banner tone="danger">{friendlyError(log.error)}</Banner> : null}
      {toggle.error ? <Banner tone="danger">{friendlyError(toggle.error)}</Banner> : null}
    </Card>
  );
}
