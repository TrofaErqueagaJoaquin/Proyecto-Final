import type { Pose, Scene, ShapeElement } from '../engine';
import { sitFloor } from '../poses';

// Canasta de tesoros: el bebé, sentado frente a la canasta, saca una cuchara y una tapa y las
// sacude; el adulto, sentado enfrente, le nombra cada objeto.
const baby = 0.55;
// Sentado mirando a la izquierda (sitFloor espejado), con la canasta entre las piernas.
const sit: Pose = {
  x: 146,
  y: 127.45,
  torso: -6,
  la: [-20, -60],
  ra: [-35, -75],
  ll: [-80, -95],
  rl: [-85, -92],
};
const adult = { ...sitFloor(70), torso: 0 };
const point: Pose = { ...adult, torso: 4, ra: [95, 100] };

/** Globo de diálogo del adulto, con la palabra que nombra. */
const say = (text: string, on: number, off: number): ShapeElement[] => {
  const fade = [
    { t: 0, x: 96, y: 68, o: 0 },
    { t: on, x: 96, y: 68, o: 0 },
    { t: on + 0.04, x: 96, y: 68, o: 1 },
    { t: off, x: 96, y: 68, o: 1 },
    { t: off + 0.04, x: 96, y: 68, o: 0 },
  ];
  return [
    {
      kind: 'path',
      d: 'M-18 -8 H18 Q22 -8 22 -4 V4 Q22 8 18 8 H-8 L-16 14 L-13 8 H-18 Q-22 8 -22 4 V-4 Q-22 -8 -18 -8 Z',
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: fade,
    },
    { kind: 'text', text, size: 9, fill: 'coral', frames: fade.map((f) => ({ ...f, y: f.y + 3 })) },
  ];
};

const scene: Scene = {
  duration: 7000,
  still: 0.2,
  bg: 'leaf',
  elements: [
    // Recipiente (queda en la canasta).
    { kind: 'rect', w: 9, h: 10, r: 2, fill: 'coral', frames: [{ t: 0, x: 112, y: 112 }] },
    // Tapa: el bebé la saca y la golpetea.
    {
      kind: 'path',
      d: 'M-6.5 0 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0 M-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0',
      fill: 'sky',
      stroke: 'muted',
      sw: 1.2,
      frames: [
        { t: 0, x: 122, y: 110, rot: 0 },
        { t: 0.5, x: 122, y: 110, rot: 0 },
        { t: 0.6, x: 134, y: 97, rot: 0 },
        { t: 0.68, x: 131, y: 99, rot: -15 },
        { t: 0.76, x: 136, y: 96, rot: 15 },
        { t: 0.84, x: 134, y: 97, rot: 0 },
        { t: 0.92, x: 122, y: 110, rot: 0 },
      ],
    },
    // Cuchara de madera: el bebé la saca y la sacude.
    {
      kind: 'path',
      d: 'M0 8 L0 -3 M-3 -7 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0',
      fill: 'wood',
      stroke: 'wood',
      sw: 2.2,
      frames: [
        { t: 0, x: 131, y: 110, rot: 10 },
        { t: 0.1, x: 135, y: 97, rot: 0 },
        { t: 0.18, x: 132, y: 99, rot: -20 },
        { t: 0.26, x: 137, y: 96, rot: 15 },
        { t: 0.34, x: 135, y: 97, rot: 0 },
        { t: 0.44, x: 131, y: 110, rot: 10 },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: baby,
      frames: [
        { t: 0, ...sit, torso: -32, ra: [-144, -19] },
        { t: 0.1, ...sit, ra: [-115, -161] },
        { t: 0.18, ...sit, ra: [-115, -132], head: 6 },
        { t: 0.26, ...sit, ra: [-121, -175], head: -4 },
        { t: 0.34, ...sit, ra: [-115, -161] },
        { t: 0.44, ...sit, torso: -32, ra: [-144, -19] },
        { t: 0.5, ...sit, torso: -38, ra: [-119, -96] },
        { t: 0.6, ...sit, ra: [-109, -155] },
        { t: 0.68, ...sit, ra: [-116, -120], head: 6 },
        { t: 0.76, ...sit, ra: [-113, -171], head: -4 },
        { t: 0.84, ...sit, ra: [-109, -155] },
        { t: 0.92, ...sit, torso: -38, ra: [-119, -96] },
      ],
    },
    // La canasta (adelante del bebé: tapa las piernas y lo que está adentro).
    {
      kind: 'rect',
      w: 32,
      h: 15,
      r: 3,
      fill: 'sun',
      stroke: 'wood',
      sw: 2,
      frames: [{ t: 0, x: 122, y: 122.5 }],
    },
    {
      kind: 'path',
      d: 'M-13 -2 H13 M-13 3 H13',
      fill: 'none',
      stroke: 'wood',
      sw: 1.2,
      frames: [{ t: 0, x: 122, y: 122.5 }],
    },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...adult },
        { t: 0.12, ...adult },
        { t: 0.16, ...point },
        { t: 0.38, ...point },
        { t: 0.44, ...adult },
        { t: 0.62, ...adult },
        { t: 0.66, ...point },
        { t: 0.86, ...point },
        { t: 0.92, ...adult },
      ],
    },
    ...say('cuchara', 0.12, 0.38),
    ...say('tapa', 0.62, 0.86),
  ],
};

export default scene;
