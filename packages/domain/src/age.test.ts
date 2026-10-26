import { describe, expect, it } from 'vitest';

import { ageInMonths, formatAge } from './age';

const NOW = new Date(Date.UTC(2026, 9, 26)); // 26/10/2026

describe('ageInMonths', () => {
  it.each([
    ['2026-10', 0],
    ['2026-09-01', 1],
    ['2022-08', 50],
    ['2015-09-01', 133],
  ])('%s → %i meses', (birthMonth, expected) => {
    expect(ageInMonths(birthMonth, NOW)).toBe(expected);
  });

  it('rechaza meses de nacimiento futuros', () => {
    expect(() => ageInMonths('2026-11', NOW)).toThrow(RangeError);
  });

  it.each(['2026-13', '26-10', '2026-10-15', ''])('rechaza el formato "%s"', (value) => {
    expect(() => ageInMonths(value, NOW)).toThrow(RangeError);
  });
});

describe('formatAge', () => {
  it.each([
    [0, 'menos de 1 mes'],
    [1, '1 mes'],
    [8, '8 meses'],
    [12, '1 año'],
    [13, '1 año y 1 mes'],
    [50, '4 años y 2 meses'],
  ])('%i → "%s"', (months, expected) => {
    expect(formatAge(months)).toBe(expected);
  });

  it('rechaza valores negativos o fraccionarios', () => {
    expect(() => formatAge(-1)).toThrow(RangeError);
    expect(() => formatAge(1.5)).toThrow(RangeError);
  });
});
