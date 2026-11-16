// Cada ruta con un parámetro ([id]) necesita su reescritura en apps/app/vercel.json: la web es un
// export estático y, sin ella, abrir el enlace directo (o recargar) da 404. Pasó con /chequeo.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const APP = join(import.meta.dirname, '..', 'apps', 'app');

function dynamicRoutes(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // Los grupos "(family)" no forman parte de la URL.
      const segment = /^\(.*\)$/.test(name) ? '' : `/${name}`;
      return dynamicRoutes(path, `${prefix}${segment}`);
    }
    if (!name.endsWith('.tsx') || name.startsWith('_')) return [];
    const base = name.replace(/\.tsx$/, '');
    const route = base === 'index' ? prefix : `${prefix}/${base}`;
    return route.includes('[') ? [route] : [];
  });
}

test('vercel.json reescribe todas las rutas con parámetros', () => {
  const config = JSON.parse(readFileSync(join(APP, 'vercel.json'), 'utf8')) as {
    rewrites: { source: string }[];
  };
  const sources = new Set(config.rewrites.map((r) => r.source));
  const missing = dynamicRoutes(join(APP, 'src', 'app'))
    .map((route) => route.replace(/\[(\w+)\]/g, ':$1'))
    .filter((source) => !sources.has(source));
  assert.deepEqual(missing, []);
});
