import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** Lo que tarda en cerrarse una ventana (deslizar o desvanecer) antes de abrir la siguiente. */
const CLOSE_MS = 450;

interface Queue {
  active: string | null;
  claim: (id: string) => void;
  release: (id: string) => void;
}

const QueueContext = createContext<Queue>({
  active: null,
  claim: () => undefined,
  release: () => undefined,
});

/**
 * Turnos para las ventanas (detalle de una actividad, festejos de Brote, logros, bienvenida):
 * nunca hay dos a la vista y la siguiente espera a que la anterior termine de cerrarse. Dos
 * Modal a la vez se apilan en Android y web, y en iOS el segundo no se llega a presentar.
 */
export function OverlayQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<string[]>([]);
  const [resting, setResting] = useState(false);
  const current = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const claim = useCallback((id: string) => {
    if (current.current.includes(id)) return;
    current.current = [...current.current, id];
    setQueue(current.current);
  }, []);

  const release = useCallback((id: string) => {
    const before = current.current;
    if (!before.includes(id)) return;
    if (before[0] === id) {
      // Se cierra la que estaba a la vista: la próxima espera su animación de salida.
      setResting(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setResting(false);
      }, CLOSE_MS);
    }
    current.current = before.filter((other) => other !== id);
    setQueue(current.current);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ active: resting ? null : (queue[0] ?? null), claim, release }),
    [queue, resting, claim, release],
  );
  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

/** ¿Le toca a esta ventana estar a la vista? `wants` = quiere mostrarse. */
export function useOverlayTurn(id: string, wants: boolean): boolean {
  const { active, claim, release } = useContext(QueueContext);
  useEffect(() => {
    if (wants) claim(id);
    else release(id);
  }, [id, wants, claim, release]);
  useEffect(
    () => () => {
      release(id);
    },
    [id, release],
  );
  return wants && active === id;
}
