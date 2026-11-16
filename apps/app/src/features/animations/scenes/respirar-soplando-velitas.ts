import type { Scene, ShapeElement } from '../engine';
import { stand } from '../poses';

// Velitas con los dedos: la mano frente a la cara; inspira (se estira) y sopla despacio una velita
// por vez, que se apaga.
const k = 0.9;
const HAND_Y = 64;
const fingerX = (i: number) => 96 + i * 4.2;
const fingerTop = (i: number) => HAND_Y - 9 + Math.abs(2 - i) * 1.5;

const fingers: ShapeElement[] = [0, 1, 2, 3, 4].map((i) => ({
  kind: 'rect',
  w: 3.2,
  h: 11,
  r: 1.6,
  fill: 'cream',
  stroke: 'coral',
  sw: 1.4,
  frames: [{ t: 0, x: fingerX(i), y: fingerTop(i) + 5 }],
}));
const flames: ShapeElement[] = [0, 1, 2, 3, 4].map((i) => {
  const off = 0.16 + i * 0.14;
  const at = { x: fingerX(i), y: fingerTop(i) - 4 };
  return {
    kind: 'ellipse',
    rx: 2,
    ry: 3.6,
    fill: 'sun',
    frames: [
      { t: 0, ...at, s: 1, o: 1 },
      { t: off, ...at, s: 1, o: 1 },
      { t: off + 0.05, x: at.x + 3, y: at.y, s: 0.2, o: 0 },
      { t: 0.93, ...at, s: 0.2, o: 0 },
    ],
  };
});
const breath = (delay: number): ShapeElement => ({
  kind: 'path',
  d: 'M0 0 C 3 -2, 5 2, 8 0',
  fill: 'none',
  stroke: 'sky',
  sw: 1.8,
  frames: [
    { t: 0, x: 86, y: 63, o: 0 },
    { t: delay, x: 86, y: 63, o: 0 },
    { t: delay + 0.05, x: 89, y: 61, o: 1 },
    { t: delay + 0.1, x: 93, y: 59, o: 0 },
  ],
});

const scene: Scene = {
  duration: 8000,
  still: 0.08,
  bg: 'sky',
  elements: [
    {
      kind: 'figure',
      color: 'coral',
      scale: k,
      frames: [
        // La mano derecha arriba, frente a la cara. Inspira (torso atrás) y sopla (adelante).
        { t: 0, ...stand(80, k), ra: [95, 165], torso: 0 },
        { t: 0.08, ...stand(80, k), ra: [95, 165], torso: -5 },
        { t: 0.16, ...stand(80, k), ra: [95, 165], torso: 5 },
        { t: 0.23, ...stand(80, k), ra: [95, 165], torso: -5 },
        { t: 0.3, ...stand(80, k), ra: [95, 165], torso: 5 },
        { t: 0.37, ...stand(80, k), ra: [95, 165], torso: -5 },
        { t: 0.44, ...stand(80, k), ra: [95, 165], torso: 5 },
        { t: 0.51, ...stand(80, k), ra: [95, 165], torso: -5 },
        { t: 0.58, ...stand(80, k), ra: [95, 165], torso: 5 },
        { t: 0.65, ...stand(80, k), ra: [95, 165], torso: -5 },
        { t: 0.72, ...stand(80, k), ra: [95, 165], torso: 5 },
        { t: 0.85, ...stand(80, k), la: [-150, -175], ra: [95, 165] },
      ],
    },
    ...fingers,
    ...flames,
    breath(0.16),
    breath(0.3),
    breath(0.44),
    breath(0.58),
    breath(0.72),
  ],
};

export default scene;
