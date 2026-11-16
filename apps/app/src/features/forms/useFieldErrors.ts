import { useState } from 'react';

/**
 * Muestra el error de cada campo recién cuando la persona sale de él (`touch`) o cuando intenta
 * guardar (`attempt`), para no retar mientras todavía escribe. `errors` son los errores actuales;
 * `attempt` devuelve `true` si se puede guardar.
 */
export function useFieldErrors<K extends string>(errors: Record<K, string | undefined>) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const hasErrors = Object.values<string | undefined>(errors).some((e) => e !== undefined);

  return {
    hasErrors,
    attempted,
    /** Para `onBlur`: desde ahora ese campo muestra su error. */
    touch: (field: K) => () => {
      setTouched((t) => ({ ...t, [field]: true }));
    },
    /** El error a mostrar de un campo (o `undefined` si todavía no corresponde). */
    shown: (field: K) => (attempted || touched[field] ? errors[field] : undefined),
    /** Al tocar "Guardar": muestra todos los errores y dice si se puede seguir. */
    attempt: () => {
      setAttempted(true);
      return !hasErrors;
    },
    /** Después de guardar, vuelve a empezar (por ejemplo, para cargar otra credencial). */
    reset: () => {
      setTouched({});
      setAttempted(false);
    },
  };
}
