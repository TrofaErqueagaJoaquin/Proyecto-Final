import { linesToList, slugify } from './slug';

describe('slugify', () => {
  it('saca tildes, signos y espacios', () => {
    expect(slugify('¡Rayuela en el patio!')).toBe('rayuela-en-el-patio');
    expect(slugify('Ñandú y pingüino')).toBe('nandu-y-pinguino');
  });
  it('AAA queda como aaa', () => {
    expect(slugify('AAA')).toBe('aaa');
  });
  it('sin letras ni números usa el respaldo', () => {
    expect(slugify('¿?', 'actividad')).toBe('actividad');
  });
  it('corta en 60 sin dejar un guion al final', () => {
    const slug = slugify(`${'a'.repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('linesToList', () => {
  it('un elemento por renglón, sin viñetas ni vacíos', () => {
    expect(linesToList('- Tiza\n\n• Una piedrita \n')).toEqual(['Tiza', 'Una piedrita']);
  });
});
