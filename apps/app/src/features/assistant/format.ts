import type { AssistantCitation } from '@crecer/shared';

/** El modelo marca la negrita con **…**: se muestra como negrita, nunca con los asteriscos. */
export function boldSegments(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*\n]+\*\*)/g)
    .filter((part) => part !== '')
    .map((part) =>
      /^\*\*[^*\n]+\*\*$/.test(part)
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}

/**
 * Una fuente citada desde varios fragmentos ([F2] y [F4] de la misma actividad) se muestra una sola
 * vez, con todas sus referencias: "F2/F4 · …".
 */
export function groupCitations(citations: AssistantCitation[]): AssistantCitation[] {
  const bySlug = new Map<string, AssistantCitation>();
  for (const citation of citations) {
    const seen = bySlug.get(citation.slug);
    bySlug.set(
      citation.slug,
      seen ? { ...seen, ref: `${seen.ref}/${citation.ref}` } : { ...citation },
    );
  }
  return [...bySlug.values()];
}
