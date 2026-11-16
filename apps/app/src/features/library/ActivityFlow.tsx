import { mondayOf } from '@crecer/domain';
import { usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { ActivityScene, sceneFor } from '@/features/animations';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { useActiveFamily } from '@/features/families/queries';
import { localDate, useWeekPlans } from '@/features/plans/queries';
import { Sheet, Text, useOverlayTurn } from '@/ui';

import { ActivityDetail } from './ActivityDetail';
import { useActivities, useSavedActivities } from './queries';

interface Done {
  id: string;
  slug: string;
  title: string;
}

interface Opened {
  slug: string;
  title?: string;
  /** Si se abrió desde el plan: "Realizado" completa ese ítem (racha, logros y plan al día). */
  planItemId?: string;
}

interface Flow {
  /** Abre la ventana con el detalle de una actividad. */
  open: (slug: string, title?: string, options?: { planItemId?: string }) => void;
  /** Festeja una actividad realizada y propone la siguiente. */
  celebrate: (done: Done) => void;
}

const FlowContext = createContext<Flow>({ open: () => undefined, celebrate: () => undefined });

export const useActivityFlow = () => useContext(FlowContext);

/** Elige qué proponer después: lo que sigue del plan, la lista "Para hacer" o una de 10 minutos. */
function useNextSuggestion(excludeSlug: string) {
  const { family } = useActiveFamily();
  const plans = useWeekPlans(family?.id, mondayOf(localDate()));
  const saved = useSavedActivities(family?.id);
  const activities = useActivities();
  return useMemo(() => {
    const all = activities.data ?? [];
    const bySlug = new Map(all.map((a) => [a.slug, a]));
    const byId = new Map(all.map((a) => [a.id, a]));
    const planned = (plans.data ?? [])
      .flatMap((p) => p.items)
      .filter((i) => i.status === 'planned' && i.activity.slug !== excludeSlug)
      .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))[0];
    const fromPlan = planned ? bySlug.get(planned.activity.slug) : undefined;
    if (planned && fromPlan) return { activity: fromPlan, planItemId: planned.id };
    const later = (saved.data ?? [])
      .map((s) => byId.get(s.activity_id))
      .find((a) => a && a.slug !== excludeSlug);
    if (later) return { activity: later, planItemId: undefined };
    const quick = all.filter(
      (a) => a.slug !== excludeSlug && a.duration_min <= 10 && a.materials.length === 0,
    );
    // Una de 10 minutos sin materiales; varía según la actividad recién hecha.
    const seed = [...excludeSlug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const idea = quick[seed % Math.max(quick.length, 1)];
    return idea ? { activity: idea, planItemId: undefined } : null;
  }, [excludeSlug, plans.data, saved.data, activities.data]);
}

/** "¡Realizado!" y la siguiente sugerida. Solo se monta al festejar (no consulta nada antes). */
function Celebration({
  done,
  visible,
  onClose,
  onNext,
}: {
  done: Done;
  visible: boolean;
  onClose: () => void;
  onNext: (slug: string, title: string, planItemId?: string) => void;
}) {
  const suggestion = useNextSuggestion(done.slug);
  const next = suggestion?.activity;
  return (
    <GuidePopup
      visible={visible}
      celebrate
      title="¡Realizado!"
      message={next ? '¿Seguimos con otra?' : 'Bien ahí. Lo que hicieron hoy suma.'}
      primary={
        next
          ? {
              label: '¡Vamos!',
              onPress: () => {
                onNext(next.slug, next.title, suggestion?.planItemId);
              },
            }
          : undefined
      }
      secondary={{ label: 'Listo por hoy', onPress: onClose }}
      onClose={onClose}
    >
      {next ? (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <ActivityScene
            scene={sceneFor(next.slug, next.categories)}
            width={220}
            label={next.title}
          />
          <Text variant="subheading" center>
            {next.title}
          </Text>
        </View>
      ) : null}
    </GuidePopup>
  );
}

export function ActivityFlowProvider({ children }: { children: ReactNode }) {
  // Lo que se muestra queda guardado aunque la ventana se cierre, para que no se vacíe mientras
  // termina de deslizarse; `sheetOpen` y `celebrating` dicen si tiene que estar a la vista.
  const [opened, setOpened] = useState<Opened | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const sheetVisible = useOverlayTurn('actividad', sheetOpen);
  const celebrationVisible = useOverlayTurn('festejo', celebrating);

  // Al cambiar de pantalla (por ejemplo, "Ingresá" desde el detalle) la ventana se cierra.
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setSheetOpen(false);
  }

  const open = useCallback((slug: string, title?: string, options?: { planItemId?: string }) => {
    setCelebrating(false);
    setOpened({ slug, title, planItemId: options?.planItemId });
    setSheetOpen(true);
  }, []);
  const celebrate = useCallback((d: Done) => {
    // El turno de ventanas espera a que se cierre el detalle antes de mostrar el festejo.
    setSheetOpen(false);
    setDone(d);
    setCelebrating(true);
  }, []);
  const value = useMemo(() => ({ open, celebrate }), [open, celebrate]);

  return (
    <FlowContext.Provider value={value}>
      {children}
      <Sheet
        visible={sheetVisible}
        title={opened?.title}
        onClose={() => {
          setSheetOpen(false);
        }}
      >
        {opened ? (
          <ActivityDetail
            key={opened.slug}
            slug={opened.slug}
            planItemId={opened.planItemId}
            onDone={celebrate}
          />
        ) : null}
      </Sheet>
      {done ? (
        <Celebration
          done={done}
          visible={celebrationVisible}
          onClose={() => {
            setCelebrating(false);
          }}
          onNext={(slug, title, planItemId) => {
            open(slug, title, { planItemId });
          }}
        />
      ) : null}
    </FlowContext.Provider>
  );
}
