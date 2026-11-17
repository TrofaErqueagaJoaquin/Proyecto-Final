import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * `false` en el HTML estático y durante la hidratación en el navegador; `true` después.
 * Lo que depende del cliente (ancho de la ventana, sesión) tiene que esperar a esto para que el
 * primer render coincida con el HTML generado en el build (si no, React tira el error #418).
 * En nativo no hay hidratación: es `true` desde el primer render.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
