import type { Scene } from './engine';
import { GENERIC } from './generic';
import { SCENES } from './scenes';

export { ActivityScene } from './ActivityScene';
export type { Scene } from './engine';

/** La escena propia de la actividad o, si no tiene (cargada desde el panel), la de su tipo. */
export function sceneFor(slug: string, categories: readonly string[] = []): Scene {
  return SCENES[slug] ?? GENERIC[categories[0] ?? ''] ?? GENERIC.movimiento!;
}

export { SCENES };
