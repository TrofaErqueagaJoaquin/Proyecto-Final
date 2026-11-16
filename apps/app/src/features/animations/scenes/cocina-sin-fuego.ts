import type { Hue, Keyframe, Motion, Scene, ShapeElement } from '../engine';
import { armsUp, stand } from '../poses';

// Cocina sin fuego: el chico arma una brocheta de fruta en la mesa (saca cada fruta del bol y la
// pincha en el palito); el adulto acompaña, la recibe y la prueban.
const k = 0.7;
const K = stand(112, k);
const A = stand(58);
const kidHold = { ...K, la: [-34, -125] as [number, number] };

// El palito: dónde está su centro en cada momento (lo agarra de abajo, 9 px bajo el centro).
const stick: Keyframe<Partial<Motion>>[] = [
  { t: 0, x: 99, y: 81, o: 1 },
  { t: 0.46, x: 99, y: 81 },
  { t: 0.52, x: 98, y: 75 },
  { t: 0.6, x: 89, y: 77 },
  { t: 0.68, x: 72, y: 79 },
  { t: 0.76, x: 68, y: 71 },
  { t: 0.84, x: 72, y: 79, o: 1 },
  { t: 0.88, x: 72, y: 79, o: 0 },
  { t: 0.96, x: 99, y: 81, o: 0 },
];

/** Una fruta: espera en el bol, la mano la lleva al palito y después viaja con él. */
const fruit = (fill: Hue, bowl: [number, number], pick: number, offset: number): ShapeElement => {
  const at = { x: bowl[0], y: bowl[1] };
  const on = pick + 0.08;
  return {
    kind: 'circle',
    r: 3.6,
    fill,
    frames: [
      { t: 0, ...at, o: 1 },
      { t: pick, ...at, o: 1 },
      { t: on, x: 99, y: 81 + offset, o: 1 },
      ...stick.filter((f) => f.t > on && f.t < 0.96).map((f) => ({ ...f, y: (f.y ?? 0) + offset })),
      { t: 0.96, ...at, o: 0 },
    ],
  };
};

const scene: Scene = {
  duration: 8000,
  still: 0.4,
  bg: 'mint',
  elements: [
    // La receta dibujada, pegada en la pared.
    {
      kind: 'rect',
      w: 24,
      h: 30,
      r: 2,
      fill: 'cream',
      stroke: 'muted',
      sw: 1,
      frames: [{ t: 0, x: 160, y: 50 }],
    },
    {
      kind: 'path',
      d: 'M-8 -9 H2 M-8 -3 H2 M-8 3 H2 M-8 9 H2 M6 -11 V11',
      fill: 'none',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 160, y: 50 }],
    },
    { kind: 'circle', r: 1.8, fill: 'leaf', frames: [{ t: 0, x: 166, y: 44 }] },
    { kind: 'circle', r: 1.8, fill: 'sun', frames: [{ t: 0, x: 166, y: 49 }] },
    { kind: 'circle', r: 1.8, fill: 'coral', frames: [{ t: 0, x: 166, y: 54 }] },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...A },
        { t: 0.26, ...A, head: 8 },
        { t: 0.44, ...A },
        { t: 0.6, ...A, torso: 12, ra: [57, 54] },
        { t: 0.68, ...A, ra: [10, 64] },
        { t: 0.76, ...A, ra: [-12, 100] },
        { t: 0.84, ...A, ra: [10, 64] },
        { t: 0.92, ...A },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...kidHold },
        { t: 0.06, ...kidHold, ra: [20, 134] },
        { t: 0.14, ...kidHold, ra: [-61, -165] },
        { t: 0.22, ...kidHold, ra: [43, 126] },
        { t: 0.3, ...kidHold, ra: [-96, -172] },
        { t: 0.38, ...kidHold, ra: [66, 97] },
        { t: 0.46, ...kidHold, ra: [-144, -147] },
        { t: 0.52, ...K, la: [-64, -145] },
        { t: 0.6, ...K, torso: -15, la: [-76, -118] },
        { t: 0.68, ...K },
        { t: 0.76, ...armsUp(112, k) },
        { t: 0.84, ...K },
        { t: 0.92, ...K },
        { t: 0.96, ...kidHold },
      ],
    },
    // La mesa (adelante: el chico queda detrás).
    { kind: 'rect', w: 84, h: 5, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 108, y: 100.5 }] },
    { kind: 'rect', w: 3.5, h: 27, fill: 'wood', frames: [{ t: 0, x: 72, y: 116.5 }] },
    { kind: 'rect', w: 3.5, h: 27, fill: 'wood', frames: [{ t: 0, x: 144, y: 116.5 }] },
    // Bol.
    {
      kind: 'path',
      d: 'M-10 -3 Q -10 5, 0 5 Q 10 5, 10 -3 Z',
      fill: 'cream',
      stroke: 'muted',
      sw: 1.4,
      frames: [{ t: 0, x: 126, y: 93 }],
    },
    // Palito de la brocheta y las frutas.
    { kind: 'path', d: 'M0 -16 L0 11', fill: 'none', stroke: 'wood', sw: 1.8, frames: stick },
    fruit('coral', [122, 89], 0.06, 2),
    fruit('sun', [126, 88], 0.22, -4),
    fruit('leaf', [130, 89], 0.38, -10),
  ],
};

export default scene;
