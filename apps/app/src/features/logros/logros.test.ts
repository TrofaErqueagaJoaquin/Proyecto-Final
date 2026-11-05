import { badges, bestStreak, currentStreak } from './logros';

describe('currentStreak', () => {
  it('cuenta los días seguidos hasta hoy', () => {
    expect(currentStreak(['2026-11-03', '2026-11-04', '2026-11-05'], '2026-11-05')).toBe(3);
  });

  it('si hoy todavía no hicieron nada, la racha de ayer sigue viva', () => {
    expect(currentStreak(['2026-11-03', '2026-11-04'], '2026-11-05')).toBe(2);
  });

  it('un día salteado la corta', () => {
    expect(currentStreak(['2026-11-01', '2026-11-03'], '2026-11-05')).toBe(0);
  });

  it('cuenta una vez un día con varias actividades', () => {
    expect(currentStreak(['2026-11-05', '2026-11-05'], '2026-11-05')).toBe(1);
  });
});

describe('bestStreak', () => {
  it('encuentra la racha más larga aunque esté cortada', () => {
    expect(bestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10'])).toBe(3);
  });

  it('cruza el fin de mes', () => {
    expect(bestStreak(['2026-10-31', '2026-11-01'])).toBe(2);
  });
});

describe('badges', () => {
  it('da los logros según lo hecho', () => {
    const list = badges({
      activities: 10,
      streak: 2,
      bestStreak: 3,
      checks: new Set(['chequeo', 'tema-sueno']),
    });
    const earned = list.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(['chequeo', 'primera', 'racha-3', 'diez']);
  });

  it('sin nada hecho, no hay logros', () => {
    const list = badges({ activities: 0, streak: 0, bestStreak: 0, checks: new Set() });
    expect(list.some((b) => b.earned)).toBe(false);
  });
});
