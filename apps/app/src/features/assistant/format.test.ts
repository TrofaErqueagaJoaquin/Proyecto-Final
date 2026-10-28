import { boldSegments, groupCitations } from './format';

describe('boldSegments', () => {
  it('convierte **…** en negrita y deja el resto igual', () => {
    expect(boldSegments('1. **Acordá antes** cuánto dura [F4].')).toEqual([
      { text: '1. ', bold: false },
      { text: 'Acordá antes', bold: true },
      { text: ' cuánto dura [F4].', bold: false },
    ]);
  });

  it('deja tal cual un ** sin cerrar (mientras llega la respuesta)', () => {
    expect(boldSegments('Hola **Acor')).toEqual([{ text: 'Hola **Acor', bold: false }]);
  });
});

describe('groupCitations', () => {
  const cite = (ref: string, slug: string) => ({
    ref,
    slug,
    title: slug,
    urlPath: null,
    evidenceLabel: 'Propuesta del proyecto',
  });

  it('une las referencias a la misma fuente y conserva el orden', () => {
    const grouped = groupCitations([cite('F3', 'c'), cite('F4', 'a'), cite('F2', 'a')]);
    expect(grouped.map((c) => c.ref)).toEqual(['F3', 'F4/F2']);
  });
});
