import { describe, expect, it } from 'vitest';

import { chunkMarkdown, estimateTokens, plainText } from './chunk';

const CARD = `# Ficha C

Introducción breve.

## En casa

- Avisar antes de apagar.
- Usar un **temporizador** visible.

### Con poco tiempo

Un aviso de 5 minutos alcanza.

## Consultar si

Las reacciones duran mucho o lastiman.
`;

describe('chunkMarkdown', () => {
  it('fragmenta por títulos con la ruta completa', () => {
    const chunks = chunkMarkdown('Ficha C · Reacción intensa al apagar', CARD, 'Qué hacer.');
    expect(chunks.map((c) => c.headingPath)).toEqual([
      'Ficha C · Reacción intensa al apagar',
      'Ficha C · Reacción intensa al apagar › En casa',
      'Ficha C · Reacción intensa al apagar › En casa › Con poco tiempo',
      'Ficha C · Reacción intensa al apagar › Consultar si',
    ]);
    expect(chunks.map((c) => c.ordinal)).toEqual([0, 1, 2, 3]);
  });

  it('la introducción lleva el resumen y el texto queda sin Markdown', () => {
    const [intro, home] = chunkMarkdown('Ficha C', CARD, 'Qué hacer.');
    expect(intro?.body).toBe('Qué hacer.\n\nIntroducción breve.');
    expect(home?.body).toBe('• Avisar antes de apagar.\n• Usar un temporizador visible.');
  });

  it('una sección larga se parte en piezas de hasta ~600 tokens que se superponen', () => {
    const sentence = 'Esta es una oración de ejemplo con varias palabras para llenar espacio.';
    const long = `## Largo\n\n${Array.from({ length: 120 }, () => sentence).join(' ')}`;
    const chunks = chunkMarkdown('Doc', long);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) expect(chunk.tokenEstimate).toBeLessThanOrEqual(600);
    // Superposición: el comienzo de cada pieza repite el final de la anterior.
    const [first, second] = chunks;
    expect(second?.body.startsWith(sentence)).toBe(true);
    expect(first?.body.endsWith(sentence)).toBe(true);
  });

  it('omite secciones vacías', () => {
    expect(chunkMarkdown('Doc', '## Vacía\n\n## Con texto\n\nAlgo.')).toHaveLength(1);
  });
});

describe('plainText y estimateTokens', () => {
  it('quita enlaces, énfasis e imágenes', () => {
    expect(plainText('Ver [la guía](https://x.org) y ![img](a.png) **ya**.')).toBe(
      'Ver la guía y  ya.',
    );
  });

  it('estima ~4 caracteres por token', () => {
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});
