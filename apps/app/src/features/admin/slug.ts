/**
 * Identificador para la dirección web a partir de un título: "¡Rayuela en el patio!" →
 * "rayuela-en-el-patio". Si no queda ninguna letra ni número, usa el respaldo. La base lo vuelve a
 * validar y, si ya existe, le agrega -2, -3…
 */
export function slugify(text: string, fallback = 'contenido'): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug === '' ? fallback : slug;
}

/** Texto de varias líneas → lista sin renglones vacíos (materiales, variantes). */
export function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter((line) => line !== '');
}
