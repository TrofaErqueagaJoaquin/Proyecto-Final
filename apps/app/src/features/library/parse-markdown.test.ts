import { parseInline, parseMarkdown, splitSections } from './parse-markdown';

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

describe('splitSections', () => {
  it('corta por títulos ## y deja los ### adentro', () => {
    const source = [
      'Intro.',
      '',
      '## Lo que **más** necesita',
      '- Jugar.',
      '### Detalle',
      'Texto.',
      '',
      '## Pantallas',
      '- Poco.',
    ].join('\n');
    expect(splitSections(source)).toEqual([
      { title: null, body: 'Intro.' },
      { title: 'Lo que más necesita', body: '- Jugar.\n### Detalle\nTexto.' },
      { title: 'Pantallas', body: '- Poco.' },
    ]);
  });

  it('sin títulos devuelve todo junto', () => {
    expect(splitSections('Solo texto.')).toEqual([{ title: null, body: 'Solo texto.' }]);
  });
});
