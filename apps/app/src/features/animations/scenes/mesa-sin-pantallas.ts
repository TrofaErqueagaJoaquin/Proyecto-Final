import type { Pose, Scene, ShapeElement } from '../engine';
import { sitChair } from '../poses';

// Comidas sin pantallas: antes de comer, el chico guarda su celular en la canasta y el del adulto,
// que se lo desliza por la mesa; después charlan con una pregunta divertida.
const k = 0.7;
const A = sitChair(46);
// El chico, sentado mirando a la izquierda (sitChair espejado).
const K: Pose = {
  ...sitChair(148, k),
  la: [-40, -85],
  ra: [-30, -80],
  ll: [-88, 0],
  rl: [-92, -2],
};

const adultHold: Pose = { ...A, ra: [14, 104] };
const kidHold: Pose = { ...K, ra: [6, -90] };
const kidDrop: Pose = { ...K, torso: 25, ra: [64, -233] };

/** Globo de diálogo con la cola abajo, hacia la izquierda o la derecha. */
const bubble = (w: number, tail: 'left' | 'right') => {
  const h = w / 2;
  const bottom =
    tail === 'left'
      ? `H${-h + 14} L${-h + 6} 14 L${-h + 9} 8`
      : `H${h - 9} L${h - 6} 14 L${h - 14} 8`;
  return `M${-h + 4} -8 H${h - 4} Q${h} -8 ${h} -4 V4 Q${h} 8 ${h - 4} 8 ${bottom} H${-h + 4} Q${-h} 8 ${-h} 4 V-4 Q${-h} -8 ${-h + 4} -8 Z`;
};
const say = (
  text: string,
  x: number,
  y: number,
  w: number,
  tail: 'left' | 'right',
  on: number,
  off: number,
): ShapeElement[] => {
  const fade = [
    { t: 0, x, y, o: 0 },
    { t: on, x, y, o: 0 },
    { t: on + 0.03, x, y, o: 1 },
    { t: off, x, y, o: 1 },
    { t: off + 0.03, x, y, o: 0 },
  ];
  return [
    { kind: 'path', d: bubble(w, tail), fill: 'cream', stroke: 'muted', sw: 1.4, frames: fade },
    { kind: 'text', text, size: 8, fill: 'ink', frames: fade.map((f) => ({ ...f, y: f.y + 3 })) },
  ];
};

const phone = { kind: 'rect', w: 5.5, h: 10, r: 1.2, fill: 'sky', stroke: 'ink', sw: 1.4 } as const;

const scene: Scene = {
  duration: 9000,
  still: 0.5,
  bg: 'coral',
  elements: [
    // Sillas.
    { kind: 'rect', w: 3, h: 32, r: 1, fill: 'wood', frames: [{ t: 0, x: 34.5, y: 99 }] },
    { kind: 'rect', w: 22, h: 3, r: 1, fill: 'wood', frames: [{ t: 0, x: 45, y: 113.5 }] },
    {
      kind: 'path',
      d: 'M-9 0 V15 M9 0 V15',
      fill: 'none',
      stroke: 'wood',
      sw: 2.5,
      frames: [{ t: 0, x: 45, y: 115 }],
    },
    { kind: 'rect', w: 3, h: 23, r: 1, fill: 'wood', frames: [{ t: 0, x: 160.5, y: 108.5 }] },
    { kind: 'rect', w: 20, h: 3, r: 1, fill: 'wood', frames: [{ t: 0, x: 150, y: 119 }] },
    {
      kind: 'path',
      d: 'M-8 0 V10 M8 0 V10',
      fill: 'none',
      stroke: 'wood',
      sw: 2.5,
      frames: [{ t: 0, x: 150, y: 120.5 }],
    },
    // La mesa con la comida.
    { kind: 'rect', w: 62, h: 4, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 96, y: 99 }] },
    {
      kind: 'path',
      d: 'M-26 0 V29 M26 0 V29',
      fill: 'none',
      stroke: 'wood',
      sw: 3,
      frames: [{ t: 0, x: 96, y: 101 }],
    },
    { kind: 'ellipse', rx: 7, ry: 3, fill: 'leaf', frames: [{ t: 0, x: 96, y: 91.5 }] },
    {
      kind: 'path',
      d: 'M-9 -2 Q -9 5, 0 5 Q 9 5, 9 -2 Z',
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 96, y: 92 }],
    },
    // Banquito de la canasta.
    { kind: 'rect', w: 18, h: 3, r: 1, fill: 'wood', frames: [{ t: 0, x: 176, y: 108 }] },
    {
      kind: 'path',
      d: 'M-7 0 V21 M7 0 V21',
      fill: 'none',
      stroke: 'wood',
      sw: 2.5,
      frames: [{ t: 0, x: 176, y: 109 }],
    },
    // Celular del adulto: lo apoya en la mesa, lo desliza y el chico lo guarda.
    {
      ...phone,
      frames: [
        { t: 0, x: 63, y: 88.5, rot: 0, o: 1 },
        { t: 0.08, x: 63, y: 88.5, rot: 0 },
        { t: 0.14, x: 76, y: 93.5, rot: 90 },
        { t: 0.2, x: 119, y: 93.5, rot: 90 },
        { t: 0.26, x: 119, y: 93.5, rot: 90 },
        { t: 0.33, x: 172, y: 92.5, rot: -10, o: 1 },
        { t: 0.9, x: 172, y: 92.5, rot: -10, o: 1 },
        { t: 0.93, x: 172, y: 92.5, rot: -10, o: 0 },
        { t: 0.96, x: 63, y: 88.5, rot: 0, o: 0 },
      ],
    },
    // Celular del chico.
    {
      ...phone,
      frames: [
        { t: 0, x: 139, y: 103, rot: 0, o: 1 },
        { t: 0.06, x: 178, y: 92.5, rot: 10, o: 1 },
        { t: 0.9, x: 178, y: 92.5, rot: 10, o: 1 },
        { t: 0.93, x: 178, y: 92.5, rot: 10, o: 0 },
        { t: 0.96, x: 139, y: 103, rot: 0, o: 0 },
      ],
    },
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...adultHold },
        { t: 0.08, ...adultHold },
        { t: 0.14, ...A, torso: 20, ra: [29, 88] },
        { t: 0.19, ...A, torso: 20, ra: [58, 66] },
        { t: 0.25, ...A },
        { t: 0.4, ...A, ra: [37, 132] },
        { t: 0.5, ...A, ra: [37, 132], head: 6 },
        { t: 0.6, ...A },
        { t: 0.72, ...A, head: -6 },
        { t: 0.86, ...A },
        { t: 0.94, ...adultHold },
      ],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...kidHold },
        { t: 0.06, ...kidDrop },
        { t: 0.12, ...K },
        { t: 0.2, ...K },
        { t: 0.26, ...K, torso: -35, ra: [-79, -126] },
        { t: 0.33, ...kidDrop },
        { t: 0.4, ...K },
        { t: 0.62, ...K },
        // "¡Volar!": abre los brazos como alas.
        { t: 0.68, ...K, la: [-95, -100], ra: [95, 100] },
        { t: 0.74, ...K, la: [-125, -135], ra: [125, 135] },
        { t: 0.8, ...K, la: [-85, -90], ra: [85, 90] },
        { t: 0.86, ...K },
        { t: 0.94, ...kidHold },
      ],
    },
    // La canasta (adelante de la mano que guarda).
    {
      kind: 'rect',
      w: 18,
      h: 11,
      r: 2,
      fill: 'sun',
      stroke: 'wood',
      sw: 1.5,
      frames: [{ t: 0, x: 176, y: 101 }],
    },
    ...say('¿superpoder?', 76, 56, 62, 'left', 0.38, 0.62),
    ...say('¡volar!', 126, 72, 40, 'right', 0.62, 0.88),
  ],
};

export default scene;
