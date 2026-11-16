import type { Hue, Pose, Scene, ShapeElement } from '../engine';
import { armsUp, jump, stand } from '../poses';

// Acuerdo familiar de pantallas: adulto y chico proponen y escriben las reglas en un afiche, lo
// firman los dos y festejan el acuerdo.
const k = 0.7;
const A = stand(62);
const K = stand(128, k);
const A10: Pose = { ...A, torso: 10 };
const K15: Pose = { ...K, torso: -15 };

/** Aparece (escrito) entre `from` y `to`, y se borra al final de la vuelta. */
const written = (x: number, y: number, from: number, to: number) => [
  { t: 0, x, y, o: 0 },
  { t: from, x, y, o: 0 },
  { t: to, x, y, o: 1 },
  { t: 0.92, x, y, o: 1 },
  { t: 0.96, x, y, o: 0 },
];

/** Un renglón del afiche: viñeta de color y línea. */
const rule = (y: number, color: Hue, from: number, to: number): ShapeElement[] => [
  { kind: 'circle', r: 1.8, fill: color, frames: written(81.5, y, from, to) },
  { kind: 'line', x2: 30, stroke: 'muted', sw: 2, frames: written(85, y, from, to) },
];

/** Firma (un garabato) del color de cada uno. */
const signature = (x: number, color: Hue, from: number, to: number): ShapeElement => ({
  kind: 'path',
  d: 'M0 0 C 2 -5, 4 4, 6 0 S 10 -4, 12 1',
  fill: 'none',
  stroke: color,
  sw: 1.6,
  frames: written(x, 86, from, to),
});

const scene: Scene = {
  duration: 9000,
  still: 0.86,
  bg: 'coral',
  elements: [
    // El afiche pegado en la pared.
    {
      kind: 'rect',
      w: 44,
      h: 62,
      r: 2,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 100, y: 65 }],
    },
    { kind: 'rect', w: 9, h: 4, fill: 'sun', frames: [{ t: 0, x: 79, y: 35, rot: -35, o: 0.85 }] },
    { kind: 'rect', w: 9, h: 4, fill: 'sun', frames: [{ t: 0, x: 121, y: 35, rot: 35, o: 0.85 }] },
    { kind: 'text', text: 'Reglas', size: 8, fill: 'ink', frames: [{ t: 0, x: 94.5, y: 46 }] },
    ...rule(54, 'sky', 0.11, 0.2),
    ...rule(63, 'sky', 0.27, 0.36),
    ...rule(72, 'mint', 0.43, 0.52),
    signature(82, 'sky', 0.57, 0.64),
    signature(105, 'mint', 0.67, 0.74),
    // Tilde de "listo".
    {
      kind: 'path',
      d: 'M-4 0 L-1 3 L5 -4',
      fill: 'none',
      stroke: 'leaf',
      sw: 2.2,
      frames: [
        { t: 0, x: 117, y: 42, o: 0, s: 0.5 },
        { t: 0.77, x: 117, y: 42, o: 0, s: 0.5 },
        { t: 0.8, x: 117, y: 42, o: 1, s: 1.2 },
        { t: 0.84, x: 117, y: 42, o: 1, s: 1 },
        { t: 0.92, x: 117, y: 42, o: 1, s: 1 },
        { t: 0.96, x: 117, y: 42, o: 0, s: 1 },
      ],
    },
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...A },
        // Escribe la regla 1.
        { t: 0.1, ...A, ra: [121, 124] },
        { t: 0.13, ...A, ra: [115, 118] },
        { t: 0.16, ...A, ra: [121, 124] },
        { t: 0.19, ...A, ra: [115, 118] },
        // Propone y escribe la regla 2.
        { t: 0.23, ...A, ra: [150, 175] },
        { t: 0.27, ...A, ra: [80, 128] },
        { t: 0.3, ...A, ra: [99, 102] },
        { t: 0.33, ...A, ra: [80, 128] },
        { t: 0.36, ...A, ra: [99, 102] },
        { t: 0.4, ...A },
        // Firma.
        { t: 0.56, ...A10, ra: [18, 73] },
        { t: 0.59, ...A10, ra: [54, 57] },
        { t: 0.62, ...A10, ra: [18, 73] },
        { t: 0.66, ...A },
        { t: 0.78, ...armsUp(62) },
        { t: 0.86, ...A, ra: [140, 170] },
        { t: 0.92, ...A },
      ],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...K },
        // Propone la regla 1 (levanta la mano).
        { t: 0.04, ...K, la: [-150, -170] },
        { t: 0.09, ...K },
        // Propone y escribe la regla 3.
        { t: 0.38, ...K, la: [-150, -170] },
        { t: 0.42, ...K15, la: [-144, -148] },
        { t: 0.45, ...K15, la: [-134, -189] },
        { t: 0.48, ...K15, la: [-144, -148] },
        { t: 0.51, ...K15, la: [-134, -189] },
        { t: 0.56, ...K },
        // Firma.
        { t: 0.66, ...K15, la: [-60, -138] },
        { t: 0.69, ...K15, la: [-42, -180] },
        { t: 0.72, ...K15, la: [-60, -138] },
        { t: 0.76, ...K },
        { t: 0.8, ...jump(128, k) },
        { t: 0.86, ...armsUp(128, k) },
        { t: 0.92, ...K },
      ],
    },
  ],
};

export default scene;
