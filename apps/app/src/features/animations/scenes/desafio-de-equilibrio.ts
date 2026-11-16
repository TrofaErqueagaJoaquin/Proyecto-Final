import type { Pose, Scene, ShapeElement } from '../engine';
import { oneFoot } from '../poses';

// Desafío de equilibrio: adulto y chico, cada uno en un pie, se pasan la pelota sin apoyar el
// otro pie mientras cuentan hasta 10.
const k = 0.7;
// El adulto mira a la derecha: pierna levantada hacia atrás (a la izquierda).
const A: Pose = { ...oneFoot(62), ll: [-40, -150], rl: [3, 0] };
const K: Pose = oneFoot(140, k);

const adultHold: Pose = { ...A, la: [30, 93], ra: [40, 95] };
const adultLow: Pose = { ...A, la: [41, 38], ra: [47, 44] };
const adultUp: Pose = { ...A, la: [110, 167], ra: [119, 154] };
const kidCatch: Pose = { ...K, la: [-51, -126], ra: [-34, -125] };
const kidLow: Pose = { ...K, la: [-23, -91], ra: [-11, -88] };
const kidUp: Pose = { ...K, la: [-130, -164], ra: [-121, -183] };

/** Los números de la cuenta, del 1 al 10, uno por vez. */
const count: ShapeElement[] = Array.from({ length: 10 }, (_, i) => {
  const from = i / 10;
  const to = (i + 1) / 10;
  const at = { x: 100, y: 24 };
  const frames =
    i === 0
      ? [
          { t: 0, ...at, o: 1 },
          { t: to - 0.005, ...at, o: 1 },
          { t: to, ...at, o: 0 },
          { t: 0.995, ...at, o: 0 },
        ]
      : [
          { t: 0, ...at, o: 0 },
          { t: from - 0.005, ...at, o: 0 },
          { t: from, ...at, o: 1 },
          { t: Math.min(to, 1) - 0.005, ...at, o: 1 },
          ...(i < 9 ? [{ t: to, ...at, o: 0 }] : []),
        ];
  return { kind: 'text', text: String(i + 1), size: 12, fill: 'muted', frames };
});

const scene: Scene = {
  duration: 6000,
  still: 0.24,
  bg: 'mint',
  elements: [
    ...count,
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...adultHold },
        { t: 0.08, ...adultLow },
        { t: 0.16, ...adultUp },
        { t: 0.26, ...A },
        { t: 0.34, ...A, torso: -4, ll: [-45, -145] },
        { t: 0.44, ...A, torso: 3 },
        { t: 0.54, ...A, torso: -2 },
        { t: 0.64, ...adultHold, la: [20, 80], ra: [30, 85] },
        { t: 0.72, ...adultHold },
        { t: 0.82, ...adultHold, torso: -3 },
        { t: 0.92, ...adultHold, torso: 2 },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...K },
        { t: 0.08, ...K, torso: 4, rl: [45, 145] },
        { t: 0.16, ...K, torso: -3 },
        { t: 0.24, ...kidCatch, la: [-40, -110], ra: [-25, -110] },
        { t: 0.32, ...kidCatch },
        { t: 0.4, ...kidCatch, torso: 3 },
        { t: 0.48, ...kidLow },
        { t: 0.56, ...kidUp },
        { t: 0.66, ...K },
        { t: 0.76, ...K, torso: -4, rl: [45, 145] },
        { t: 0.86, ...K, torso: 3 },
      ],
    },
    // La pelota va y viene en arco.
    {
      kind: 'circle',
      r: 5,
      fill: 'sun',
      stroke: 'wood',
      sw: 1,
      frames: [
        { t: 0, x: 88, y: 76 },
        { t: 0.08, x: 85, y: 87 },
        { t: 0.16, x: 82, y: 45 },
        { t: 0.24, x: 104, y: 38 },
        { t: 0.32, x: 121, y: 87 },
        { t: 0.4, x: 121, y: 87 },
        { t: 0.48, x: 123, y: 94 },
        { t: 0.56, x: 127, y: 67 },
        { t: 0.64, x: 104, y: 40 },
        { t: 0.72, x: 88, y: 76 },
      ],
    },
  ],
};

export default scene;
