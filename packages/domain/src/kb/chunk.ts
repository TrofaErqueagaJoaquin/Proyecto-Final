/**
 * Fragmentación de la base de conocimiento (AI_ARCHITECTURE.md §4.2): por títulos (## y ###),
 * con un objetivo de ~350 tokens, máximo 600 y ~50 de superposición, cortando en oraciones.
 * Cada sección es un fragmento propio, así "Consultar si" se recupera con precisión.
 */

export interface Chunk {
  ordinal: number;
  headingPath: string;
  body: string;
  tokenEstimate: number;
}

const TARGET_TOKENS = 350;
const MAX_TOKENS = 600;
const OVERLAP_TOKENS = 50;

/** Estimación simple y estable (~4 caracteres por token en español). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** Markdown → texto plano legible (sin énfasis, enlaces ni imágenes). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parte una sección larga en piezas de ~350 tokens que se superponen ~50. */
function splitLong(text: string): string[] {
  if (estimateTokens(text) <= MAX_TOKENS) return [text];
  const parts: string[] = [];
  let current: string[] = [];
  let tokens = 0;
  for (const sentence of sentences(text)) {
    const t = estimateTokens(sentence);
    if (tokens + t > TARGET_TOKENS && current.length > 0) {
      parts.push(current.join(' '));
      // Superposición: las últimas oraciones hasta ~50 tokens.
      const overlap: string[] = [];
      let overlapTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const s = current[i] ?? '';
        overlapTokens += estimateTokens(s);
        if (overlapTokens > OVERLAP_TOKENS) break;
        overlap.unshift(s);
      }
      current = overlap;
      tokens = overlap.reduce((sum, s) => sum + estimateTokens(s), 0);
    }
    current.push(sentence);
    tokens += t;
  }
  if (current.length > 0) parts.push(current.join(' '));
  return parts;
}

export function chunkMarkdown(title: string, markdown: string, summary?: string): Chunk[] {
  const sections: { path: string[]; lines: string[] }[] = [{ path: [], lines: [] }];
  let h2: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const text = (heading[2] ?? '').trim();
      if (level === 2) h2 = text;
      sections.push({ path: level === 2 || h2 === null ? [text] : [h2, text], lines: [] });
      continue;
    }
    if (/^#\s+/.test(line)) continue; // el título del documento ya va en heading_path
    sections.at(-1)?.lines.push(line);
  }

  const chunks: Chunk[] = [];
  for (const [index, section] of sections.entries()) {
    let body = plainText(section.lines.join('\n'));
    // La introducción sin título lleva el resumen, que suele ser la idea principal.
    if (index === 0 && summary) body = [summary, body].filter(Boolean).join('\n\n');
    if (!body) continue;
    const headingPath = [title, ...section.path].join(' › ');
    for (const piece of splitLong(body)) {
      chunks.push({
        ordinal: chunks.length,
        headingPath,
        body: piece,
        tokenEstimate: estimateTokens(piece),
      });
    }
  }
  return chunks;
}
