import type { Keyframe, Motion, Pose, Scene, ShapeElement } from '../engine';
import { armsUp, crouch, stand, walkA, walkB } from '../poses';

// Búsqueda del tesoro en la plaza: con la lista dibujada (hoja, piedra, algo amarillo, pájaro), el
// chico encuentra cada cosa y se marca en la lista; el adulto lo acompaña con el papel.
const k = 0.7;

// Agachado con las manos hacia el piso.
const pick = (x: number): Pose => ({
  ...crouch(x, k),
  y: 113.2,
  torso: 32,
  la: [11, 8],
  ra: [16, 13],
});
// Señalando el pájaro, arriba a la derecha.
const point = (x: number): Pose => ({ ...stand(x, k), ra: [137, 137] });
// El adulto sostiene el papel con la mano izquierda adelante.
const HOLD = { la: [40, 100] as [number, number] };
const paperAt = (t: number, x: number): Keyframe<Partial<Motion>> => ({ t, x: x + 24, y: 75 });

const bird = (
  x: number,
  y: number,
  s: number,
  frames?: Keyframe<Partial<Motion>>[],
): ShapeElement[] => [
  { kind: 'ellipse', rx: 4.5, ry: 3, fill: 'sky', frames: frames ?? [{ t: 0, x, y, s }] },
  { kind: 'circle', r: 2.4, fill: 'sky', frames: [{ t: 0, x: x - 4 * s, y: y - 2.6 * s, s }] },
  {
    kind: 'poly',
    points: '0,-1 -2.5,0 0,1',
    fill: 'sun',
    frames: [{ t: 0, x: x - 6.2 * s, y: y - 2.6 * s, s }],
  },
];
const leafShape = 'M-5 0 Q0 -4 5 0 Q0 4 -5 0 Z';

// Lista de arriba: ícono, casillero y tilde (que aparece cuando se encuentra).
const ICON_X = [24, 49, 74, 99];
const FOUND = [0.21, 0.4, 0.58, 0.68];
const checks: ShapeElement[] = ICON_X.flatMap((x, i) => [
  {
    kind: 'rect',
    w: 7,
    h: 7,
    r: 1.5,
    fill: 'none',
    stroke: 'muted',
    sw: 1.2,
    frames: [{ t: 0, x: x + 9, y: 18 }],
  },
  {
    kind: 'path',
    d: 'M-3 0 L-1 2.5 L3.5 -3.5',
    fill: 'none',
    stroke: 'leaf',
    sw: 2,
    frames: [
      { t: 0, x: x + 9, y: 18, o: 0, s: 1 },
      { t: FOUND[i]!, x: x + 9, y: 18, o: 0, s: 0.4 },
      { t: FOUND[i]! + 0.03, x: x + 9, y: 17.5, o: 1, s: 1.2 },
      { t: 0.86, x: x + 9, y: 17.5, o: 1, s: 1.2 },
      { t: 0.9, x: x + 9, y: 18, o: 0, s: 1 },
    ],
  },
]);

/** Un aro que marca lo que se encontró. */
const ring = (x: number, y: number, at: number): ShapeElement => ({
  kind: 'circle',
  r: 8,
  fill: 'none',
  stroke: 'coral',
  sw: 1.6,
  frames: [
    { t: 0, x, y, s: 0.5, o: 0 },
    { t: at - 0.01, x, y, s: 0.5, o: 0 },
    { t: at + 0.02, x, y, s: 1, o: 1 },
    { t: at + 0.08, x, y, s: 1.1, o: 1 },
    { t: at + 0.11, x, y, s: 1.2, o: 0 },
  ],
});

const scene: Scene = {
  duration: 9000,
  still: 0.72,
  bg: 'leaf',
  elements: [
    // Árbol con el pájaro en una rama.
    { kind: 'rect', w: 7, h: 56, r: 2, fill: 'wood', frames: [{ t: 0, x: 176, y: 102 }] },
    { kind: 'line', x2: -18, y2: -6, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 172, y: 72 }] },
    { kind: 'circle', r: 15, fill: 'leaf', frames: [{ t: 0, x: 177, y: 62 }] },
    ...bird(158, 62, 1),
    // En el piso: una hoja, una piedra redonda y una flor amarilla.
    {
      kind: 'path',
      d: leafShape,
      fill: 'leaf',
      frames: [{ t: 0, x: 96, y: 127, rot: -15, s: 1.2 }],
    },
    { kind: 'ellipse', rx: 4.4, ry: 3.6, fill: 'muted', frames: [{ t: 0, x: 118, y: 126.5 }] },
    { kind: 'line', x2: 0, y2: -9, stroke: 'leaf', sw: 2, frames: [{ t: 0, x: 148, y: 130 }] },
    { kind: 'circle', r: 3.4, fill: 'sun', frames: [{ t: 0, x: 148, y: 120 }] },
    ring(96, 126, FOUND[0]!),
    ring(118, 126, FOUND[1]!),
    ring(148, 121, FOUND[2]!),
    ring(156, 61, FOUND[3]!),
    // La lista dibujada.
    {
      kind: 'rect',
      w: 100,
      h: 18,
      r: 4,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.4,
      frames: [{ t: 0, x: 64, y: 18 }],
    },
    {
      kind: 'path',
      d: leafShape,
      fill: 'leaf',
      frames: [{ t: 0, x: ICON_X[0]!, y: 18, rot: -15, s: 0.9 }],
    },
    { kind: 'ellipse', rx: 3.4, ry: 2.8, fill: 'muted', frames: [{ t: 0, x: ICON_X[1]!, y: 18 }] },
    { kind: 'circle', r: 3.4, fill: 'sun', frames: [{ t: 0, x: ICON_X[2]!, y: 18 }] },
    ...bird(ICON_X[3]! + 1, 19, 0.8),
    ...checks,
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...stand(24), ...HOLD },
        { t: 0.06, ...walkA(34), ...HOLD },
        { t: 0.12, ...walkB(40), ...HOLD },
        { t: 0.18, ...stand(42), ...HOLD },
        { t: 0.27, ...stand(42), ...HOLD },
        { t: 0.32, ...walkA(56), ...HOLD },
        { t: 0.38, ...stand(70), ...HOLD },
        { t: 0.46, ...stand(70), ...HOLD },
        { t: 0.51, ...walkB(80), ...HOLD },
        { t: 0.56, ...stand(88), ...HOLD },
        { t: 0.74, ...stand(88), ...HOLD },
        { t: 0.78, ...stand(88), ...HOLD, ra: [150, 170] },
        { t: 0.83, ...walkA(74), ...HOLD },
        { t: 0.89, ...walkB(56), ...HOLD },
        { t: 0.95, ...walkA(40), ...HOLD },
      ],
    },
    // El papel en la mano del adulto.
    {
      kind: 'rect',
      w: 8,
      h: 10,
      r: 1,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: [
        paperAt(0, 24),
        paperAt(0.06, 35.5),
        paperAt(0.12, 41.5),
        paperAt(0.18, 42),
        paperAt(0.27, 42),
        paperAt(0.32, 57.5),
        paperAt(0.38, 70),
        paperAt(0.46, 70),
        paperAt(0.51, 81.5),
        paperAt(0.56, 88),
        paperAt(0.78, 88),
        paperAt(0.83, 75.5),
        paperAt(0.89, 57.5),
        paperAt(0.95, 41.5),
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...stand(62, k) },
        { t: 0.06, ...walkB(70, k) },
        { t: 0.12, ...walkA(76, k) },
        { t: 0.18, ...pick(80) },
        { t: 0.26, ...pick(80) },
        { t: 0.31, ...walkA(94, k) },
        { t: 0.37, ...pick(102) },
        { t: 0.45, ...pick(102) },
        { t: 0.5, ...walkA(122, k) },
        { t: 0.55, ...pick(132) },
        { t: 0.61, ...pick(132) },
        { t: 0.66, ...point(128) },
        { t: 0.74, ...point(128) },
        { t: 0.78, ...armsUp(128, k) },
        { t: 0.83, ...walkA(113, k) },
        { t: 0.89, ...walkB(95, k) },
        { t: 0.95, ...walkA(78, k) },
      ],
    },
  ],
};

export default scene;
