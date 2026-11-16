import { AGE_OPTIONS, birthMonthFromAge } from './age';

describe('birthMonthFromAge', () => {
  const now = new Date(2026, 10, 5); // 5 de noviembre de 2026

  it('toma la mitad del año cumplido', () => {
    expect(birthMonthFromAge(4, now)).toBe('2022-05-01');
  });

  it('con menos de 1 año, 6 meses atrás', () => {
    expect(birthMonthFromAge(0, now)).toBe('2026-05-01');
  });

  it('cruza el cambio de año', () => {
    expect(birthMonthFromAge(1, new Date(2026, 2, 10))).toBe('2024-09-01');
  });
});

describe('AGE_OPTIONS', () => {
  it('va de "Menos de 1" a 17', () => {
    expect(AGE_OPTIONS).toHaveLength(18);
    expect(AGE_OPTIONS[0]?.label).toBe('Menos de 1');
    expect(AGE_OPTIONS[17]?.value).toBe('17');
  });
});
