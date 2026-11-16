import type { Keyframe, Motion, Pose, Scene, ShapeElement } from '../engine';
import { armsUp, crouch, stand } from '../poses';

// Huerta en macetas: el adulto siembra en la maceta, el chico la riega con la regadera, el brote
// crece y lo miden con una regla; al lado, una lata reciclada con una planta que ya creció.
const k = 0.7;
const POT = { x: 104, soil: 111 };

// Agachado sin que los pies se hundan en el piso.
const sow: Pose = { ...crouch(76), y: crouch(76).y - 3.5 };
const sowLift: Pose = { ...sow, ra: [70, 45] };
const kidRest: Pose = { ...stand(142, k), ra: [-15, -5] };
const kidPour: Pose = { ...stand(142, k), ra: [-70, -80], head: -6 };

// Semillas que caen de la mano del adulto a la tierra.
const seed = (start: number): ShapeElement => ({
  kind: 'circle',
  r: 1.8,
  fill: 'wood',
  frames: [
    { t: 0, x: 104, y: 98, o: 0 },
    { t: start, x: 104, y: 98, o: 1 },
    { t: start + 0.05, x: POT.x, y: POT.soil, o: 1 },
    { t: start + 0.06, x: POT.x, y: POT.soil, o: 0 },
  ],
});
// Gotas que salen de la regadera.
const drop = (start: number): ShapeElement => ({
  kind: 'ellipse',
  rx: 1.1,
  ry: 1.8,
  fill: 'sky',
  frames: [
    { t: 0, x: 108.5, y: 101, o: 0 },
    { t: start, x: 108.5, y: 101, o: 1 },
    { t: start + 0.045, x: 104.5, y: POT.soil, o: 1 },
    { t: start + 0.05, x: 104.5, y: POT.soil, o: 0 },
  ],
});
// La regadera: colgando, levantada y volcada.
const can = (x: number, y: number, rot = 0): Partial<Motion> => ({ x, y, rot });
const canFrames: Keyframe<Partial<Motion>>[] = [
  { t: 0, ...can(138, 110) },
  { t: 0.24, ...can(138, 110) },
  { t: 0.29, ...can(122, 97) },
  { t: 0.33, ...can(122, 97, -30) },
  { t: 0.5, ...can(122, 97, -30) },
  { t: 0.54, ...can(122, 97) },
  { t: 0.59, ...can(138, 110) },
];
// El brote crece desde la tierra (la forma está dibujada desde su base).
const sprout: Keyframe<Partial<Motion>>[] = [
  { t: 0, x: POT.x, y: POT.soil, s: 0.05, o: 0 },
  { t: 0.4, x: POT.x, y: POT.soil, s: 0.05, o: 0 },
  { t: 0.43, x: POT.x, y: POT.soil, s: 0.2, o: 1 },
  { t: 0.62, x: POT.x, y: POT.soil, s: 1.15, o: 1 },
  { t: 0.92, x: POT.x, y: POT.soil, s: 1.15, o: 1 },
  { t: 0.97, x: POT.x, y: POT.soil, s: 1.15, o: 0 },
];
const ruler = (dy: number): Keyframe<Partial<Motion>>[] => [
  { t: 0, x: 121, y: 110 + dy, o: 0 },
  { t: 0.64, x: 121, y: 110 + dy, o: 0 },
  { t: 0.68, x: 121, y: 110 + dy, o: 1 },
  { t: 0.9, x: 121, y: 110 + dy, o: 1 },
  { t: 0.94, x: 121, y: 110 + dy, o: 0 },
];

const scene: Scene = {
  duration: 8000,
  still: 0.48,
  bg: 'leaf',
  elements: [
    { kind: 'circle', r: 9, fill: 'sun', frames: [{ t: 0, x: 172, y: 26, o: 0.85 }] },
    // Lata reciclada con una planta aromática que ya creció.
    {
      kind: 'path',
      d: 'M0 0 V-24 M0 -8 Q-8 -12 -9 -6 Q-4 -5 0 -8 M0 -14 Q8 -18 9 -12 Q4 -11 0 -14 M0 -20 Q-7 -25 -7 -19 Q-3 -18 0 -20',
      fill: 'leaf',
      stroke: 'leaf',
      sw: 1.6,
      frames: [{ t: 0, x: 30, y: 114 }],
    },
    { kind: 'rect', w: 15, h: 17, r: 2, fill: 'muted', frames: [{ t: 0, x: 30, y: 121.5 }] },
    {
      kind: 'line',
      x2: 15,
      y2: 0,
      stroke: 'white',
      sw: 1,
      frames: [{ t: 0, x: 22.5, y: 118, o: 0.6 }],
    },
    {
      kind: 'line',
      x2: 15,
      y2: 0,
      stroke: 'white',
      sw: 1,
      frames: [{ t: 0, x: 22.5, y: 125, o: 0.6 }],
    },
    // Regla para medir cuánto creció.
    { kind: 'rect', w: 4, h: 40, r: 1, fill: 'sun', frames: ruler(0) },
    ...[-12, -4, 4, 12].map((dy): ShapeElement => ({
      kind: 'line',
      x2: 2.5,
      y2: 0,
      stroke: 'wood',
      sw: 1,
      frames: ruler(dy),
    })),
    // El brote.
    {
      kind: 'path',
      d: 'M0 0 V-14 M0 -9 Q-7 -14 -9 -9 Q-4 -7 0 -9 M0 -12 Q7 -18 9 -13 Q4 -11 0 -12',
      fill: 'leaf',
      stroke: 'leaf',
      sw: 1.6,
      frames: sprout,
    },
    // Maceta con tierra.
    { kind: 'ellipse', rx: 10, ry: 2.4, fill: 'wood', frames: [{ t: 0, x: POT.x, y: POT.soil }] },
    {
      kind: 'poly',
      points: '-11,-8 11,-8 8,9 -8,9',
      fill: 'coral',
      frames: [{ t: 0, x: POT.x, y: 121 }],
    },
    { kind: 'rect', w: 25, h: 5, r: 1.5, fill: 'coral', frames: [{ t: 0, x: POT.x, y: 113.5 }] },
    seed(0.08),
    seed(0.14),
    seed(0.2),
    ...[0.34, 0.38, 0.42, 0.46].map(drop),
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...sow },
        { t: 0.05, ...sowLift },
        { t: 0.1, ...sow },
        { t: 0.15, ...sowLift },
        { t: 0.2, ...sow },
        { t: 0.6, ...sow, head: -8 },
        { t: 0.66, ...stand(76), ra: [40, 60] },
        { t: 0.76, ...armsUp(76) },
        { t: 0.84, ...stand(76), ra: [40, 60] },
        { t: 0.9, ...sow },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...kidRest },
        { t: 0.24, ...kidRest },
        { t: 0.29, ...kidPour },
        { t: 0.54, ...kidPour },
        { t: 0.59, ...kidRest },
        { t: 0.68, ...kidRest, la: [-100, -110] },
        { t: 0.78, ...kidRest, la: [-150, -175] },
        { t: 0.86, ...kidRest, la: [-100, -110] },
        { t: 0.92, ...kidRest },
      ],
    },
    // Regadera (la mano del chico la agarra del asa).
    {
      kind: 'path',
      d: 'M-6 -4.5 H6 V4.5 H-6 Z M-6 1.5 L-13 -4.5 M-3 -4.5 Q0 -10 3 -4.5',
      fill: 'none',
      stroke: 'mint',
      sw: 2,
      frames: canFrames,
    },
    { kind: 'rect', w: 12, h: 9, r: 1.5, fill: 'mint', frames: canFrames },
  ],
};

export default scene;
