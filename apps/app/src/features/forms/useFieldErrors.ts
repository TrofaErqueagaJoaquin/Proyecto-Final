import { useRef, useState } from 'react';
import { Platform, type TextInputInstance } from 'react-native';

type FieldRef = TextInputInstance | null;

/**
 * La regla única de validación de los formularios: el error de cada campo aparece recién cuando
 * la persona sale de él (`touch`) o cuando intenta guardar (`attempt`), para no retar mientras
 * todavía escribe, y se va solo apenas lo corrige (porque `errors` se calcula con el valor actual).
 * Al guardar con errores, el foco (y la pantalla) va al primero.
 *
 * `field(nombre)` da `ref`, `onBlur` y el Enter encadenado para pasar a un `TextField`:
 * `<TextField {...form.field('name')} label="Nombre" … />`. El orden del Enter es el de `order`
 * (o el de las claves de `errors`); el último campo llama a `onSubmit`.
 */
export function useFieldErrors<K extends string>(
  errors: Record<K, string | undefined>,
  options: { order?: readonly K[]; onSubmit?: () => void } = {},
) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const refs = useRef<Partial<Record<K, FieldRef>>>({});
  const refSetters = useRef<Partial<Record<K, (el: FieldRef) => void>>>({});
  const keys = Object.keys(errors) as K[];
  const chain = options.order ?? keys;
  const hasErrors = keys.some((k) => errors[k] !== undefined);

  const touch = (field: K) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  const setRef = (field: K) =>
    (refSetters.current[field] ??= (el: FieldRef) => {
      refs.current[field] = el;
    });

  /** Lleva el foco a un campo; en la web también lo centra en la pantalla. */
  const focus = (field: K) => {
    const el = refs.current[field];
    if (!el) return false;
    el.focus();
    if (Platform.OS === 'web') {
      (el as unknown as { scrollIntoView?: (o: object) => void }).scrollIntoView?.({
        block: 'center',
        behavior: 'smooth',
      });
    }
    return true;
  };

  /** El siguiente campo de la cadena que esté en pantalla. */
  const focusNext = (field: K) => {
    const index = chain.indexOf(field);
    if (index !== -1) {
      for (const next of chain.slice(index + 1)) {
        if (focus(next)) return;
      }
    }
    options.onSubmit?.();
  };

  return {
    hasErrors,
    attempted,
    /** Para `onBlur`: desde ahora ese campo muestra su error. */
    touch,
    /** El error a mostrar de un campo (o `undefined` si todavía no corresponde). */
    shown: (field: K) => (attempted || touched[field] ? errors[field] : undefined),
    /** Props para un `TextField`: ref, error al salir y Enter que pasa al siguiente. */
    field: (field: K) => {
      const index = chain.indexOf(field);
      const last = index === -1 || index === chain.length - 1;
      return {
        ref: setRef(field),
        onBlur: touch(field),
        error: attempted || touched[field] ? errors[field] : undefined,
        returnKeyType: last ? ('done' as const) : ('next' as const),
        onSubmitEditing: () => {
          focusNext(field);
        },
      };
    },
    /**
     * Al tocar "Guardar": muestra todos los errores, lleva el foco al primero y dice si se puede
     * seguir.
     */
    attempt: () => {
      setAttempted(true);
      if (hasErrors) {
        const first = [...chain, ...keys].find((k) => errors[k] !== undefined && refs.current[k]);
        if (first) focus(first);
      }
      return !hasErrors;
    },
    /** Después de guardar, vuelve a empezar (por ejemplo, para cargar otra credencial). */
    reset: () => {
      setTouched({});
      setAttempted(false);
    },
  };
}
