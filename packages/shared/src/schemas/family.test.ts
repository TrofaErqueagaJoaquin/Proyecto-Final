import { describe, expect, it } from 'vitest';

import {
  CreateInvitationSchema,
  formatBirthMonth,
  makeMemberSchema,
  parseBirthMonth,
  RelationshipSchema,
} from './family';

const NOW = new Date(Date.UTC(2026, 9, 27)); // 27/10/2026

describe('parseBirthMonth', () => {
  it.each([
    ['03/2022', '2022-03-01'],
    ['3/2022', '2022-03-01'],
    [' 10 / 2026 ', '2026-10-01'],
  ])('"%s" → %s', (input, expected) => {
    expect(parseBirthMonth(input, NOW)).toBe(expected);
  });

  it.each(['11/2026', '13/2020', '00/2020', '2022-03', 'marzo 2022', '03/1980', ''])(
    'rechaza "%s"',
    (input) => {
      expect(parseBirthMonth(input, NOW)).toBeNull();
    },
  );

  it('formatBirthMonth es la operación inversa', () => {
    expect(formatBirthMonth('2022-03-01')).toBe('03/2022');
  });
});

describe('makeMemberSchema', () => {
  const schema = makeMemberSchema(NOW);

  it('acepta un integrante válido y recorta el apodo', () => {
    const parsed = schema.parse({ alias: '  Tomi ', birthMonth: '03/2022', interests: ['arte'] });
    expect(parsed.alias).toBe('Tomi');
  });

  it('rechaza intereses fuera del catálogo (nada de texto libre sobre menores)', () => {
    expect(
      schema.safeParse({ alias: 'Tomi', birthMonth: '03/2022', interests: ['su escuela'] }).success,
    ).toBe(false);
  });
});

describe('catálogos alineados con la base', () => {
  it('los vínculos coinciden con el CHECK de family_memberships', () => {
    expect(RelationshipSchema.options).toEqual([
      'madre',
      'padre',
      'tutor',
      'tutora',
      'abuela',
      'abuelo',
      'otro',
    ]);
  });

  it('la invitación exige un rol de familia válido', () => {
    expect(
      CreateInvitationSchema.safeParse({ email: 'a@b.com', role: 'platform_admin' }).success,
    ).toBe(false);
  });
});
