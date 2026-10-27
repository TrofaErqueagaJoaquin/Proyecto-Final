/**
 * Parser del Markdown de la biblioteca: solo el subconjunto que valida SafeMarkdownSchema
 * (títulos ## y ###, párrafos, listas "- " y **negrita**). No interpreta HTML ni enlaces:
 * el texto se muestra siempre como texto.
 */

export interface Inline {
  text: string;
  bold: boolean;
}

export type Block =
  | { type: 'heading'; level: 2 | 3; content: Inline[] }
  | { type: 'paragraph'; content: Inline[] }
  | { type: 'list'; items: Inline[][] };

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    if (index > last) parts.push({ text: text.slice(last, index), bold: false });
    parts.push({ text: match[1] ?? '', bold: true });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', content: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: 'list', items: list.map(parseInline) });
      list = [];
    }
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading?.[1] && heading[2] !== undefined) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: heading[1].length === 2 ? 2 : 3,
        content: parseInline(heading[2]),
      });
      continue;
    }
    const item = /^-\s+(.*)$/.exec(line);
    if (item?.[1] !== undefined) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}
