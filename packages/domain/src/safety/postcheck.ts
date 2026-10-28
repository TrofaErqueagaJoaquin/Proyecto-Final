/**
 * Post-chequeo de la respuesta del modelo (AI_ARCHITECTURE.md §7.2): citas válidas y
 * patrones prohibidos. Es determinista y se prueba sin llamar al modelo.
 */

export const NO_INFO_SENTENCE = 'No tengo información revisada sobre esto.';

export const BLOCKED_ANSWER =
  'Prefiero no responder eso por acá: es algo para hablar con un profesional que conozca a tu ' +
  'familia. En “Cuándo consultar” vas a encontrar señales que orientan y a quién acudir.';

export type PostCheckOutcome = 'answered' | 'insufficient_evidence' | 'blocked';

export interface PostCheckResult {
  text: string;
  outcome: PostCheckOutcome;
  /** Referencias citadas y válidas, en orden de aparición ("F1", "F3"...). */
  citedRefs: string[];
  /** Referencias que el modelo inventó y se quitaron. */
  removedRefs: string[];
  /** Motivo del bloqueo, sin el texto (para registrar el evento). */
  blockedBy: string | null;
}

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: 'dose', pattern: /\b\d+([.,]\d+)?\s?(mg|ml|gotas|comprimidos|miligramos|mililitros)\b/i },
  {
    name: 'diagnosis',
    pattern:
      /\b(tiene|padece|sufre de|presenta)\s+(un\s+)?(tdah|autismo|tea|depresi[oó]n|un trastorno|trastorno|ansiedad patol[oó]gica)\b/i,
  },
  { name: 'addiction_label', pattern: /\b(es|son|est[aá]n?)\s+adict[oa]s?\b/i },
  { name: 'addiction_word', pattern: /\badicci[oó]n\b/i },
  {
    name: 'medication',
    pattern:
      /\b(d[aá]le|darle|administr[aá]le|que tome)\s+(melatonina|ritalina|metilfenidato|risperidona|un ansiol[ií]tico)/i,
  },
];

/**
 * Primer patrón prohibido que aparece (o null). Se usa también durante el streaming: apenas
 * aparece uno, se corta y la familia nunca lee esa parte.
 */
export function findForbidden(text: string): string | null {
  return FORBIDDEN.find(({ pattern }) => pattern.test(text))?.name ?? null;
}

function normalizeRef(ref: string): string {
  return ref.toUpperCase();
}

export function postCheck(answer: string, validRefs: readonly string[]): PostCheckResult {
  const valid = new Set(validRefs.map(normalizeRef));
  const blockedBy = findForbidden(answer);
  if (blockedBy) {
    return {
      text: BLOCKED_ANSWER,
      outcome: 'blocked',
      citedRefs: [],
      removedRefs: [],
      blockedBy,
    };
  }

  const cited: string[] = [];
  const removed: string[] = [];
  const text = answer
    .replace(/\s*\[(F\d+)\]/gi, (match, ref: string) => {
      const normalized = normalizeRef(ref);
      if (valid.has(normalized)) {
        if (!cited.includes(normalized)) cited.push(normalized);
        return match;
      }
      if (!removed.includes(normalized)) removed.push(normalized);
      return '';
    })
    .trim();

  // Sin ninguna cita válida, la respuesta no se apoya en el contenido revisado (incluida la
  // abstención "No tengo información revisada sobre esto.").
  const outcome: PostCheckOutcome = cited.length > 0 ? 'answered' : 'insufficient_evidence';
  return { text, outcome, citedRefs: cited, removedRefs: removed, blockedBy: null };
}
