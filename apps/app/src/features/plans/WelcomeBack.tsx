import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ActivityScene, sceneFor } from '@/features/animations';
import { GuidePopup } from '@/features/brote/GuidePopup';
import { useActivityFlow } from '@/features/library/ActivityFlow';
import { useActivities } from '@/features/library/queries';
import { storage } from '@/lib/storage';
import { Text, useOverlayTurn } from '@/ui';

import { localDate } from './queries';

const LAST_VISIT = 'crecer.ultimaVisita';
const DAYS_AWAY = 3;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/**
 * "¡Qué bueno verte!": si pasaron 3 días o más desde la última visita (en este dispositivo),
 * Brote recibe sin reproches y propone una actividad de 10 minutos para retomar.
 */
export function WelcomeBack() {
  const [away, setAway] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const visible = useOverlayTurn('bienvenida', away !== null && !dismissed);
  const activities = useActivities();
  const flow = useActivityFlow();

  useEffect(() => {
    let alive = true;
    const today = localDate();
    void storage
      .getItem(LAST_VISIT)
      .catch(() => null)
      .then((last) => {
        if (!alive) return;
        if (last && daysBetween(last, today) >= DAYS_AWAY) setAway(daysBetween(last, today));
        void storage.setItem(LAST_VISIT, today).catch(() => undefined);
      });
    return () => {
      alive = false;
    };
  }, []);

  const quick = (activities.data ?? []).filter(
    (a) => a.duration_min <= 10 && a.materials.length === 0,
  );
  const idea = away === null ? undefined : quick[away % Math.max(quick.length, 1)];

  return (
    <GuidePopup
      visible={visible}
      mood="hola"
      title="¡Qué bueno verte!"
      message={idea ? 'Para retomar, una cortita de 10 minutos:' : 'Cuando quieras, seguimos.'}
      primary={
        idea
          ? {
              label: '¡Hagámosla!',
              onPress: () => {
                setDismissed(true);
                flow.open(idea.slug, idea.title);
              },
            }
          : undefined
      }
      secondary={{
        label: 'Ahora no',
        onPress: () => {
          setDismissed(true);
        },
      }}
      onClose={() => {
        setDismissed(true);
      }}
    >
      {idea ? (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <ActivityScene
            scene={sceneFor(idea.slug, idea.categories)}
            width={220}
            label={idea.title}
          />
          <Text variant="subheading" center>
            {idea.title}
          </Text>
        </View>
      ) : null}
    </GuidePopup>
  );
}
