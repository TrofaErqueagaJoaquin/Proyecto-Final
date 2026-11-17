import { usePreventRemove } from 'expo-router';
import { LogOut, Pencil } from 'lucide-react-native';
import {
  createElement,
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';

import { Button, Sheet, Text, useOverlayTurn } from '@/ui';

// En un .ts (sin JSX) los hijos van como argumentos de createElement: `children` opcional.
const DialogSheet = Sheet as (
  props: Omit<Parameters<typeof Sheet>[0], 'children'> & { children?: ReactNode },
) => ReactElement;

// "¿Salir sin guardar?" para formularios a medio cargar. Cada formulario con cambios se anota
// acá; "Volver" y la barra del espacio preguntan con `confirmLeave` antes de irse, y la
// navegación del sistema (gesto, botón atrás, recargar la página) la frena `usePreventRemove`.

interface Guard {
  /** Muestra la ventana; `proceed` se hace si eligen "Salir". */
  ask: (proceed: () => void) => void;
  /** Deja salir sin volver a preguntar. */
  release: () => void;
}

/** Formularios con cambios sin guardar; el último anotado es el que pregunta. */
const dirtyGuards: Guard[] = [];

/** ¿Hay algún formulario con cambios sin guardar? */
export function hasUnsavedChanges(): boolean {
  return dirtyGuards.length > 0;
}

/**
 * Antes de navegar fuera de la pantalla: si hay cambios sin guardar pregunta "¿Salir sin
 * guardar?" y solo sigue si eligen "Salir"; si no hay, sigue enseguida.
 */
export function confirmLeave(proceed: () => void): void {
  const guard = dirtyGuards.at(-1);
  if (guard) guard.ask(proceed);
  else proceed();
}

/** Sale sin volver a preguntar en ningún formulario anotado (eligieron "Salir"). */
function releaseAll() {
  for (const guard of [...dirtyGuards]) guard.release();
}

/**
 * Protege un formulario: mientras `dirty` sea true, salir pide confirmación. Devuelve la ventana
 * (`dialog`, se pone en cualquier lugar del formulario) y `confirm`, para un "Cancelar" propio.
 */
export function useUnsavedGuard(dirty: boolean): {
  dialog: ReactElement;
  confirm: (proceed: () => void) => void;
} {
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [released, setReleased] = useState(false);
  // Si ya no hay cambios (se guardó o se vació), la próxima edición vuelve a proteger.
  if (!dirty && released) setReleased(false);
  const active = dirty && !released;

  const disablePrevention = usePreventRemove(active, ({ repeat }) => {
    confirmLeave(repeat);
  });

  const disableRef = useRef(disablePrevention);
  useEffect(() => {
    disableRef.current = disablePrevention;
  }, [disablePrevention]);

  const [guard] = useState<Guard>(() => {
    const self: Guard = {
      ask: (proceed) => {
        setPending(() => proceed);
      },
      // También apaga el freno de la navegación en el momento, sin esperar al próximo render.
      release: () => {
        setReleased(true);
        disableRef.current();
        const index = dirtyGuards.indexOf(self);
        if (index >= 0) dirtyGuards.splice(index, 1);
      },
    };
    return self;
  });

  useEffect(() => {
    if (!active) return;
    dirtyGuards.push(guard);
    return () => {
      const index = dirtyGuards.indexOf(guard);
      if (index >= 0) dirtyGuards.splice(index, 1);
    };
  }, [active, guard]);

  // Con turno: si se pide desde otra ventana (el menú de espacios), espera a que se cierre.
  const id = useId();
  const visible = useOverlayTurn(`salir-sin-guardar-${id}`, pending !== null);

  const stay = () => {
    setPending(null);
  };
  const leave = () => {
    const proceed = pending;
    setPending(null);
    releaseAll();
    proceed?.();
  };

  const dialog = createElement(
    DialogSheet,
    { visible, onClose: stay, title: '¿Salir sin guardar?' },
    createElement(
      Fragment,
      null,
      createElement(Text, null, 'Lo que cargaste todavía no se guardó.'),
      createElement(
        View,
        { style: { gap: 8 } },
        createElement(Button, {
          label: 'Seguir cargando',
          icon: Pencil,
          fullWidth: true,
          onPress: stay,
        }),
        createElement(Button, {
          label: 'Salir',
          variant: 'dangerSoft',
          icon: LogOut,
          fullWidth: true,
          onPress: leave,
        }),
      ),
    ),
  );

  return {
    dialog,
    confirm: (proceed) => {
      if (active) guard.ask(proceed);
      else proceed();
    },
  };
}
