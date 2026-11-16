import type { Hue, Pose, Scene, ShapeElement } from '../engine';
import { armsUp, jump, stand } from '../poses';

// Semáforo de la calma: el adulto señala el semáforo de papel. En rojo respiran juntos soplando
// velitas, en amarillo el chico piensa qué le pasa y en verde elige qué hacer y festeja.
const k = 0.7;
const A = stand(60);
const K = stand(142, k);
// Mano frente a la boca (velitas).
const adultBlow: Pose = { ...A, ra: [72, -170] };
const kidBlow: Pose = { ...K, la: [-66, -180] };
const kidThink: Pose = { ...K, la: [-124, 146] };

/** Una luz del semáforo: encendida (o: 1) entre `on` y `off`, si no, apagada. */
const light = (fill: Hue, y: number, on: number, off: number): ShapeElement => {
  const dim = { x: 100, y, o: 0.25, s: 1 };
  const lit = { x: 100, y, o: 1, s: 1.12 };
  const frames =
    on === 0
      ? [
          { t: 0, ...lit },
          { t: off, ...lit },
          { t: off + 0.04, ...dim },
          { t: 0.92, ...dim },
          { t: 0.96, ...lit },
        ]
      : [
          { t: 0, ...dim },
          { t: on - 0.04, ...dim },
          { t: on, ...lit },
          { t: off, ...lit },
          { t: off + 0.04, ...dim },
        ];
  return { kind: 'circle', r: 7.5, fill, frames };
};

/** Palabra que acompaña a cada color. */
const label = (text: string, fill: Hue, on: number, off: number): ShapeElement => ({
  kind: 'text',
  text,
  size: 11,
  fill,
  frames: [
    { t: 0, x: 100, y: 108, o: 0 },
    { t: on, x: 100, y: 108, o: 0 },
    { t: on + 0.03, x: 100, y: 108, o: 1 },
    { t: off, x: 100, y: 108, o: 1 },
    { t: off + 0.03, x: 100, y: 108, o: 0 },
  ],
});

/** Soplido: una rayita que sale de la boca. */
const breath = (x: number, dir: 1 | -1, delay: number): ShapeElement => ({
  kind: 'path',
  d:
    dir === 1
      ? 'M0 -2 C 3 -5, 6 1, 9 -2 M1 3 C 4 0, 7 6, 10 3'
      : 'M0 -2 C -3 -5, -6 1, -9 -2 M-1 3 C -4 0, -7 6, -10 3',
  fill: 'none',
  stroke: 'sky',
  sw: 2,
  frames: [
    { t: 0, x, y: dir === 1 ? 59 : 81, o: 0 },
    { t: delay, x, y: dir === 1 ? 59 : 81, o: 0 },
    { t: delay + 0.03, x: x + 3 * dir, y: dir === 1 ? 58 : 80, o: 1 },
    { t: delay + 0.07, x: x + 7 * dir, y: dir === 1 ? 57 : 79, o: 0 },
  ],
});

const scene: Scene = {
  duration: 9000,
  still: 0.22,
  bg: 'sky',
  elements: [
    // El semáforo dibujado en una hoja pegada en la pared.
    {
      kind: 'rect',
      w: 30,
      h: 66,
      r: 3,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 100, y: 58 }],
    },
    { kind: 'rect', w: 9, h: 4, fill: 'sun', frames: [{ t: 0, x: 87, y: 26, rot: -35, o: 0.8 }] },
    { kind: 'rect', w: 9, h: 4, fill: 'sun', frames: [{ t: 0, x: 113, y: 26, rot: 35, o: 0.8 }] },
    { kind: 'rect', w: 21, h: 56, r: 6, fill: 'ink', frames: [{ t: 0, x: 100, y: 58 }] },
    light('coral', 41, 0, 0.4),
    light('sun', 58, 0.44, 0.64),
    light('leaf', 75, 0.68, 0.92),
    label('respiro', 'coral', 0.02, 0.4),
    label('pienso', 'wood', 0.46, 0.64),
    label('elijo', 'leaf', 0.7, 0.92),
    breath(73, 1, 0.2),
    breath(73, 1, 0.32),
    breath(127, -1, 0.2),
    breath(127, -1, 0.32),
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        // Señala el rojo, respiran juntos, señala el amarillo y el verde, festeja.
        { t: 0, ...A, ra: [128, 128] },
        { t: 0.1, ...A, ra: [128, 128] },
        { t: 0.14, ...adultBlow, torso: -5 },
        { t: 0.2, ...adultBlow, torso: 5 },
        { t: 0.26, ...adultBlow, torso: -5 },
        { t: 0.32, ...adultBlow, torso: 5 },
        { t: 0.38, ...A },
        { t: 0.44, ...A, ra: [105, 105] },
        { t: 0.54, ...A, ra: [105, 105], head: 10 },
        { t: 0.64, ...A },
        { t: 0.68, ...A, ra: [78, 78] },
        { t: 0.76, ...armsUp(60) },
        { t: 0.84, ...A, ra: [140, 170] },
        { t: 0.92, ...A },
        { t: 0.96, ...A, ra: [128, 128] },
      ],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...K, head: -8 },
        { t: 0.1, ...K, head: -8 },
        { t: 0.14, ...kidBlow, torso: 5 },
        { t: 0.2, ...kidBlow, torso: -5 },
        { t: 0.26, ...kidBlow, torso: 5 },
        { t: 0.32, ...kidBlow, torso: -5 },
        { t: 0.38, ...K },
        { t: 0.46, ...kidThink, head: -8 },
        { t: 0.54, ...kidThink, head: 8 },
        { t: 0.62, ...kidThink },
        { t: 0.68, ...K },
        { t: 0.74, ...jump(142, k) },
        { t: 0.8, ...armsUp(142, k) },
        { t: 0.86, ...jump(142, k) },
        { t: 0.92, ...K },
      ],
    },
  ],
};

export default scene;
