import { pickToday } from './today';

const item = (scheduled_for: string, status = 'planned') => ({ item: { scheduled_for, status } });
const TODAY = '2026-11-05'; // jueves

describe('pickToday', () => {
  it('muestra la idea asignada a hoy', () => {
    const entries = [item('2026-11-02'), item(TODAY), item('2026-11-07')];
    expect(pickToday(entries, TODAY, false).forToday).toBe(entries[1]);
  });

  it('sin nada asignado a hoy, propone la primera pendiente para arrancar ya', () => {
    const entries = [item('2026-11-07'), item('2026-11-03')];
    const result = pickToday(entries, TODAY, false);
    expect(result.forToday).toBe(entries[1]);
    expect(result.next).toBe(entries[0]);
  });

  it('si hoy ya registraron algo, no propone otra y muestra la próxima', () => {
    const entries = [item('2026-11-03'), item('2026-11-07')];
    const result = pickToday(entries, TODAY, true);
    expect(result.forToday).toBeUndefined();
    expect(result.doneToday).toBe(true);
    expect(result.next).toBe(entries[1]);
  });

  it('cuenta como hecha hoy una idea de hoy marcada "hecha"', () => {
    const entries = [item(TODAY, 'done'), item('2026-11-02')];
    const result = pickToday(entries, TODAY, false);
    expect(result.doneToday).toBe(true);
    expect(result.forToday).toBeUndefined();
  });

  it('sin plan no hay nada que mostrar', () => {
    expect(pickToday([], TODAY, false)).toEqual({
      forToday: undefined,
      doneToday: false,
      next: undefined,
    });
  });
});
