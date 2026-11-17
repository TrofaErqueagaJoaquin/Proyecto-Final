// A dónde lleva "Volver" cuando no hay historial. Sin dependencias: se prueba sola.

/** Rutas de primer nivel del espacio público: el resto tiene "Volver". */
const PUBLIC_INDEXES = ['/actividades', '/directorio', '/situaciones'];

/** A dónde vuelve una ruta pública sin historial: su índice, o la portada. */
export function publicFallback(pathname: string): string {
  const parent = pathname.slice(0, pathname.lastIndexOf('/'));
  return PUBLIC_INDEXES.includes(parent) ? parent : '/';
}

/** Lo que necesita saber "Volver" de cada ítem de la navegación de un espacio. */
export interface SpaceItem {
  href: string;
  /** Activo solo en esa ruta exacta. */
  exact?: boolean;
  /** Solo en la barra lateral (en el teléfono no se ve). */
  wideOnly?: boolean;
}

function isUnder(pathname: string, href: string): boolean {
  return pathname.startsWith(`${href}/`);
}

/** El ítem más específico (el de ruta más larga) que contiene a `pathname`. */
function closestParent(pathname: string, items: SpaceItem[]): SpaceItem | undefined {
  return items
    .filter((item) => isUnder(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * A dónde lleva "Volver" en un espacio con sesión (familia, profesional, administración), o
 * `null` si la pantalla no lleva "Volver". No hay "Volver" en la raíz del espacio (el primer
 * ítem) ni en las secciones visibles. Lo que no está a la vista (en el teléfono, las secciones
 * solo de escritorio) sí lo lleva. Sin historial, vuelve al padre más cercano entre **todos**
 * los ítems, o a la raíz del espacio: nunca a otro espacio que pueda rebotar en círculo.
 */
export function spaceFallback(pathname: string, items: SpaceItem[], wide: boolean): string | null {
  const root = items[0]?.href ?? '/hoy';
  const visible = items.filter((item) => wide || item.wideOnly !== true);
  if (pathname === root || visible.some((item) => item.href === pathname)) return null;
  return closestParent(pathname, items)?.href ?? root;
}

/**
 * Qué ítem visible se marca como actual. Si ninguno coincide (en el teléfono, dentro de una
 * sección solo de escritorio como `/admin/usuarios`), se marca el visible que la contiene.
 */
export function activeHref(pathname: string, items: SpaceItem[], wide: boolean): string | null {
  const visible = items.filter((item) => wide || item.wideOnly !== true);
  const match =
    items.find((item) => item.href === pathname) ??
    closestParent(
      pathname,
      items.filter((item) => item.exact !== true),
    );
  if (match && visible.includes(match)) return match.href;
  return closestParent(pathname, visible)?.href ?? null;
}
