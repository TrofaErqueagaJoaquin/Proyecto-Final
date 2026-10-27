import { parseInline, parseMarkdown } from './parse-markdown';

describe('parseMarkdown', () => {
  it('reconoce títulos, párrafos y listas', () => {
    const blocks = parseMarkdown(
      [
        '## En casa',
        '',
        'Primera línea',
        'segunda línea.',
        '',
        '- **Piso:** jugar boca abajo.',
        '- Conversar.',
      ].join('\n'),
    );
    expect(blocks).toEqual([
      { type: 'heading', level: 2, content: [{ text: 'En casa', bold: false }] },
      { type: 'paragraph', content: [{ text: 'Primera línea segunda línea.', bold: false }] },
      {
        type: 'list',
        items: [
          [
            { text: 'Piso:', bold: true },
            { text: ' jugar boca abajo.', bold: false },
          ],
          [{ text: 'Conversar.', bold: false }],
        ],
      },
    ]);
  });

  it('nunca interpreta HTML: queda como texto', () => {
    const blocks = parseMarkdown('<script>alert(1)</script>');
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ text: '<script>alert(1)</script>', bold: false }] },
    ]);
  });

  it('distingue ## de ###', () => {
    const [h3] = parseMarkdown('### Detalle');
    expect(h3).toMatchObject({ type: 'heading', level: 3 });
  });
});

describe('parseInline', () => {
  it('deja como texto los asteriscos sin cerrar', () => {
    expect(parseInline('a **b')).toEqual([{ text: 'a **b', bold: false }]);
  });
});
