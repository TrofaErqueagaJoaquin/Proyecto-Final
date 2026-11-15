import { digitsMask, monthYearMask } from './masks';

/** Simula tipear carácter por carácter, como en el teclado. */
function type(text: string): string {
  let value = '';
  for (const char of text) value = monthYearMask(value + char, value);
  return value;
}

describe('monthYearMask', () => {
  it('agrega la barra sola después del mes', () => {
    expect(type('03')).toBe('03/');
    expect(type('032022')).toBe('03/2022');
  });

  it('completa con 0 un mes de un dígito mayor a 1', () => {
    expect(type('4')).toBe('04/');
    expect(type('42021')).toBe('04/2021');
  });

  it('deja escribir 1 para los meses 10 a 12', () => {
    expect(type('1')).toBe('1');
    expect(type('112023')).toBe('11/2023');
  });

  it('ignora letras y lo que sobra', () => {
    expect(type('0a3/20229')).toBe('03/2022');
  });

  it('al borrar la barra no la vuelve a poner', () => {
    expect(monthYearMask('03', '03/')).toBe('03');
    expect(monthYearMask('0', '03')).toBe('0');
  });

  it('acepta un valor pegado entero', () => {
    expect(monthYearMask('03/2022', '')).toBe('03/2022');
    expect(monthYearMask('032022', '')).toBe('03/2022');
  });
});

describe('digitsMask', () => {
  it('deja solo números hasta el máximo', () => {
    expect(digitsMask(6)('12a 34-5678', '')).toBe('123456');
  });
});
