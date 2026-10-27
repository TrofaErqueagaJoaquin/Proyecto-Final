// A dónde lleva "Volver" cuando no hay historial. Sin dependencias: se prueba sola.

/** Rutas de primer nivel del espacio público: el resto tiene "Volver". */
const PUBLIC_INDEXES = ['/actividades', '/directorio', '/situaciones'];

/** A dónde vuelve una ruta pública sin historial: su índice, o la portada. */
export function publicFallback(pathname: string): string {
  const parent = pathname.slice(0, pathname.lastIndexOf('/'));
  return PUBLIC_INDEXES.includes(parent) ? parent : '/';
}

/** Si una ruta del espacio familiar es una pantalla interna (no una sección de la navegación). */
export function familyFallback(pathname: string, sections: string[]): string | null {
  if (sections.includes(pathname)) return null;
  return sections.find((href) => pathname.startsWith(`${href}/`)) ?? '/hoy';
}
