import { Check, CircleCheck, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import { TextLink } from '@/features/auth/components';
import { feedback } from '@/features/feedback/feedback';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import { useCompleteItem } from '@/features/plans/queries';
import { Banner, Button, ChipGroup, makeStyles, Text, useTheme } from '@/ui';

import { useLogActivity, useSavedActivities, useToggleSaved } from './queries';

export const RATINGS = [
  { value: '1', label: 'No funcionó' },
  { value: '3', label: 'Más o menos' },
  { value: '5', label: '¡Nos encantó!' },
] as const;

/**
 * Lo que se pregunta al marcar "Realizado": quiénes participaron y cómo les fue. Es el mismo en
 * el plan, en Hoy y en la biblioteca. Con `planItemId` completa ese ítem del plan (racha, logros
 * y plan al día); si no, registra la actividad suelta.
 */
export function DoneForm({
  activityId,
  planItemId,
  defaultMemberIds,
  onDone,
  onCancel,
}: {
  activityId: string;
  planItemId?: string;
  /** Quiénes quedan marcados de entrada (por ejemplo, el integrante del plan). */
  defaultMemberIds?: string[];
  onDone?: () => void;
  onCancel: () => void;
}) {
  const { family } = useActiveFamily();
  const members = useMembers(family?.id);
  const logActivity = useLogActivity(family?.id);
  const completeItem = useCompleteItem();
  const log = planItemId ? completeItem : logActivity;
  // Al hacerla, sale sola de "Para hacer" (si estaba guardada para más tarde).
  const saved = useSavedActivities(family?.id);
  const unsave = useToggleSaved(family?.id);
  const wasSaved = saved.data?.some((s) => s.activity_id === activityId) ?? false;
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [rating, setRating] = useState<string | null>(null);

  const activeMembers = (members.data ?? []).filter((m) => m.archived_at === null);
  // Con un solo integrante, ya queda elegido.
  const participants =
    chosen ??
    (defaultMemberIds && defaultMemberIds.length > 0
      ? defaultMemberIds
      : activeMembers.length === 1
        ? [activeMembers[0]!.id]
        : []);

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
              // Festejo: sonido y vibración; la ventana "¿Seguimos con otra?" la abre `onDone`.
              feedback('done');
              if (wasSaved) unsave.mutate({ activityId, saved: true });
              onDone?.();
            },
          };
          if (planItemId) completeItem.mutate({ itemId: planItemId, ...input }, after);
          else logActivity.mutate({ activityId, ...input }, after);
        }}
      />
      <Button label="Cancelar" variant="ghost" fullWidth onPress={onCancel} />
      {log.error ? <Banner tone="danger">{friendlyError(log.error)}</Banner> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  savedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.sm,
    paddingLeft: t.space.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.mintSoft,
  },
  savedText: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
}));

/**
 * "Realizado" (registra que la hicieron) y "Hacer más tarde" (la deja en la lista "Para hacer" de
 * Hoy; ya guardada, se ve "✓ Está en Para hacer" con "Quitar"). Solo con sesión y familia.
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
  const [logging, setLogging] = useState(false);
  const styles = useStyles();
  const { colors } = useTheme();

  if (auth.status !== 'signedIn') {
    return (
      <Text>
        <TextLink href="/ingresar">Ingresá</TextLink> para llevar registro de lo que hacen en
        familia.
      </Text>
    );
  }
  if (!family) return null;

  if (logging) {
    return (
      <DoneForm
        activityId={activityId}
        planItemId={planItemId}
        onDone={() => {
          setLogging(false);
          onDone?.();
        }}
        onCancel={() => {
          setLogging(false);
        }}
      />
    );
  }

  const isSaved = saved.data?.some((s) => s.activity_id === activityId) ?? false;

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
      {/* Si ya está en el plan, "Hacer más tarde" sobra. */}
      {canManage(family.role) && !planItemId ? (
        isSaved ? (
          <View style={styles.savedRow}>
            <View style={styles.savedText} accessibilityRole="text">
              <Check color={colors.success} size={22} aria-hidden />
              <Text variant="label">Está en Para hacer</Text>
            </View>
            <Button
              label="Quitar"
              variant="ghost"
              accessibilityLabel="Quitar de Para hacer"
              loading={toggle.isPending}
              onPress={() => {
                feedback('tap');
                toggle.mutate({ activityId, saved: true });
              }}
            />
          </View>
        ) : (
          <Button
            label="Hacer más tarde"
            variant="secondary"
            icon={Clock}
            fullWidth
            loading={toggle.isPending}
            onPress={() => {
              feedback('tap');
              toggle.mutate({ activityId, saved: false });
            }}
          />
        )
      ) : null}
      {toggle.error ? <Banner tone="danger">{friendlyError(toggle.error)}</Banner> : null}
    </View>
  );
}
