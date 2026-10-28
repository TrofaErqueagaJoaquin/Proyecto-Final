import type { PlanItem } from '@crecer/domain';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app';
import { ANA, fakeAuthorization, fakeDeps, testEnv } from '../../test/fixtures';

import type { PlansPort } from './generate';

const FAMILY = '33333333-3333-4333-8333-333333333333';
const owner = fakeAuthorization({ families: { [ANA.userId]: { [FAMILY]: 'owner' } } });
const caregiver = fakeAuthorization({ families: { [ANA.userId]: { [FAMILY]: 'caregiver' } } });

function plans(activities = 8) {
  const saved: { weekStart: string; items: PlanItem[] }[] = [];
  const port: PlansPort = {
    loadInput: () =>
      Promise.resolve({
        agesMonths: [48],
        preferences: { minutesPerDay: 20, space: null, budget: null, interests: [] },
        activities: Array.from({ length: activities }, (_, i) => ({
          id: `a${String(i)}`,
          title: `A${String(i)}`,
          ageMinMonths: 0,
          ageMaxMonths: 216,
          durationMin: i === 0 ? 10 : 20,
          costLevel: 'free' as const,
          space: 'indoor' as const,
          materialsCount: i === 0 ? 0 : 1,
          categories: ['movimiento'],
        })),
        recommendedActivityIds: [],
        recentlyDoneIds: [],
      }),
    save: (_auth, input) => {
      saved.push({ weekStart: input.weekStart, items: input.items });
      return Promise.resolve('66666666-6666-4666-8666-666666666666');
    },
  };
  return { port, saved };
}

async function generate(deps: Parameters<typeof fakeDeps>[0], body: unknown) {
  const app = createApp(testEnv, fakeDeps(deps));
  return app.request('/v1/plans/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANA.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /v1/plans/generate', () => {
  it('arma y guarda el plan de la semana actual (desde el lunes)', async () => {
    const p = plans();
    const response = await generate(
      { plans: p.port, authorization: owner },
      { familyId: FAMILY, memberId: null },
    );
    expect(response.status).toBe(200);
    // fakeDeps fija "hoy" en el martes 27/10/2026: la semana empieza el lunes 26.
    expect(p.saved[0]?.weekStart).toBe('2026-10-26');
    expect(p.saved[0]?.items.length).toBe(6);
    expect(await response.json()).toMatchObject({ weekStart: '2026-10-26', items: 6 });
  });

  it('la caregiver no arma planes', async () => {
    const p = plans();
    const response = await generate(
      { plans: p.port, authorization: caregiver },
      { familyId: FAMILY, memberId: null },
    );
    expect(response.status).toBe(403);
    expect(p.saved).toHaveLength(0);
  });

  it('sin actividades aptas responde 409 y no guarda nada', async () => {
    const p = plans(0);
    const response = await generate(
      { plans: p.port, authorization: owner },
      { familyId: FAMILY, memberId: null },
    );
    expect(response.status).toBe(409);
    expect(p.saved).toHaveLength(0);
  });

  it('valida el pedido', async () => {
    const response = await generate({ authorization: owner }, { familyId: 'no-es-uuid' });
    expect(response.status).toBe(400);
  });
});
