import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkGuards, projectRefFromUrl } from './guards.ts';

const REF = 'abcdefghijklmnopqrst';
const ok = {
  appEnv: 'demo',
  supabaseUrl: `https://${REF}.supabase.co`,
  confirmation: 'RESET DEMO',
  environmentSetting: 'demo',
  demoProjectRef: REF,
};

test('con todo en orden no hay motivos para abortar', () => {
  assert.deepEqual(checkGuards(ok), []);
});

test('aborta fuera de APP_ENV=demo', () => {
  for (const appEnv of ['local', 'preview', 'prod', undefined]) {
    assert.equal(checkGuards({ ...ok, appEnv }).length, 1);
  }
});

test('aborta contra otro proyecto (dev, prod o local)', () => {
  for (const supabaseUrl of [
    'https://swqfiabkdhsstyubdrdv.supabase.co',
    'http://127.0.0.1:54321',
    'no es una url',
    undefined,
  ]) {
    assert.match(checkGuards({ ...ok, supabaseUrl }).join(), /no es el proyecto demo/);
  }
});

test('aborta sin la confirmación exacta', () => {
  for (const confirmation of ['', 'reset demo', 'RESET', 'si']) {
    assert.match(checkGuards({ ...ok, confirmation }).join(), /confirmación/);
  }
});

test('aborta si la base no está marcada como demo', () => {
  for (const environmentSetting of [null, 'prod', 'dev', { env: 'demo' }]) {
    assert.match(checkGuards({ ...ok, environmentSetting }).join(), /app\.environment/);
  }
});

test('aborta si todavía no se cargó el ref del proyecto demo', () => {
  assert.match(checkGuards({ ...ok, demoProjectRef: '' }).join(), /DEMO_PROJECT_REF/);
});

test('extrae el ref solo de URLs de Supabase', () => {
  assert.equal(projectRefFromUrl(`https://${REF}.supabase.co/`), REF);
  assert.equal(projectRefFromUrl(`https://${REF}.supabase.co.evil.com`), null);
  assert.equal(projectRefFromUrl('http://localhost:54321'), null);
});
