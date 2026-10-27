import { findClinicalTerms } from '@crecer/domain';

import {
  ageLabel,
  SCOPE_LABELS,
  toGrants,
  toggleScope,
  VERIFICATION_LABELS,
  type MemberScope,
} from './labels';

describe('toggleScope', () => {
  it('elegir otro alcance suma el perfil', () => {
    expect(toggleScope([], 'assessments')).toEqual(['member_profile', 'assessments']);
  });

  it('quitar el perfil quita todo lo del integrante', () => {
    expect(toggleScope(['member_profile', 'assessments', 'goals'], 'member_profile')).toEqual([]);
  });

  it('quitar un alcance deja el resto', () => {
    const current: MemberScope[] = ['member_profile', 'assessments', 'goals'];
    expect(toggleScope(current, 'goals')).toEqual(['member_profile', 'assessments']);
  });

  it('el perfil solo se puede elegir', () => {
    expect(toggleScope([], 'member_profile')).toEqual(['member_profile']);
  });
});

describe('toGrants', () => {
  it('omite integrantes sin nada elegido y ordena los alcances', () => {
    expect(toGrants({ a: ['goals', 'member_profile'], b: [] }, ['family_goals'])).toEqual([
      { member_id: 'a', scopes: ['member_profile', 'goals'] },
      { member_id: null, scopes: ['family_goals'] },
    ]);
  });

  it('sin nada elegido no hay permisos', () => {
    expect(toGrants({ a: [] }, [])).toEqual([]);
  });
});

describe('ageLabel', () => {
  it.each([
    [8, '8 meses'],
    [12, '1 año'],
    [13, '1 año y 1 mes'],
    [80, '6 años y 8 meses'],
  ] as const)('%i meses → %s', (months, expected) => {
    expect(ageLabel(months)).toBe(expected);
  });
});

describe('textos', () => {
  it('no usan vocabulario clínico', () => {
    const texts = [
      ...Object.values(SCOPE_LABELS).flatMap((s) => [s.label, s.description]),
      ...Object.values(VERIFICATION_LABELS),
    ];
    expect(texts.flatMap(findClinicalTerms)).toEqual([]);
  });
});
