import type { Keyframe, Motion, Pose, Scene, ShapeElement } from '../engine';
import { sitChair } from '../poses';

// Preguntas de la semana: el domingo, en el sillón, el adulto pregunta y escucha; el adolescente
// cuenta qué aplicación lo hizo sentir bien, cuál no tanto y propone una meta.
const teen = 0.85; // adolescente: entre chico y adulto
const A: Pose = { ...sitChair(70), y: 113.5 };
// El adolescente, sentado mirando a la izquierda (sitChair espejado).
const T: Pose = {
  ...sitChair(130, teen),
  la: [-40, -85],
  ra: [-30, -80],
  ll: [-88, 0],
  rl: [-92, -2],
};

/** Visible entre `on` y `off` (con un fundido corto). */
const shown = (x: number, y: number, on: number, off: number): Keyframe<Partial<Motion>>[] => [
  { t: 0, x, y, o: 0 },
  { t: on, x, y, o: 0 },
  { t: on + 0.03, x, y, o: 1 },
  { t: off, x, y, o: 1 },
  { t: off + 0.03, x, y, o: 0 },
];

/** Globo de diálogo con la cola abajo, hacia la izquierda o la derecha. */
const bubble = (w: number, tail: 'left' | 'right') => {
  const h = w / 2;
  const bottom =
    tail === 'left'
      ? `H${-h + 14} L${-h + 6} 14 L${-h + 9} 8`
      : `H${h - 9} L${h - 6} 14 L${h - 14} 8`;
  return `M${-h + 4} -9 H${h - 4} Q${h} -9 ${h} -5 V4 Q${h} 8 ${h - 4} 8 ${bottom} H${-h + 4} Q${-h} 8 ${-h} 4 V-5 Q${-h} -9 ${-h + 4} -9 Z`;
};

// Íconos dentro del globo del adolescente (centro en 140, 57).
const icon = (fill: 'leaf' | 'muted' | 'cream', on: number, off: number): ShapeElement => ({
  kind: 'rect',
  w: 13,
  h: 13,
  r: 3.5,
  fill,
  frames: shown(140, 57, on, off),
});
const goodApp: ShapeElement[] = [
  icon('leaf', 0.24, 0.42),
  {
    kind: 'path',
    d: 'M0 3 C -5 -0.5, -3.5 -5, 0 -2.5 C 3.5 -5, 5 -0.5, 0 3 Z',
    fill: 'white',
    frames: shown(140, 57, 0.24, 0.42),
  },
];
const sadApp: ShapeElement[] = [
  icon('muted', 0.45, 0.61),
  {
    kind: 'path',
    d: 'M-2.6 -2 h0.1 M2.5 -2 h0.1 M-3 3 Q 0 0, 3 3',
    fill: 'none',
    stroke: 'white',
    sw: 1.6,
    frames: shown(140, 57, 0.45, 0.61),
  },
];
// Meta para la semana: un blanco con su centro.
const goal: ShapeElement[] = [
  {
    kind: 'path',
    d: 'M-5.5 0 a5.5 5.5 0 1 0 11 0 a5.5 5.5 0 1 0 -11 0 M-2.4 0 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0',
    fill: 'none',
    stroke: 'coral',
    sw: 1.6,
    frames: shown(140, 57, 0.64, 0.86),
  },
  { kind: 'circle', r: 1, fill: 'coral', frames: shown(140, 57, 0.64, 0.86) },
];

const scene: Scene = {
  duration: 8000,
  still: 0.28,
  bg: 'coral',
  elements: [
    // Almanaque en la pared: domingo.
    {
      kind: 'rect',
      w: 26,
      h: 22,
      r: 2,
      fill: 'cream',
      stroke: 'muted',
      sw: 1,
      frames: [{ t: 0, x: 172, y: 40 }],
    },
    { kind: 'rect', w: 26, h: 5, r: 1.5, fill: 'coral', frames: [{ t: 0, x: 172, y: 31.5 }] },
    { kind: 'text', text: 'DOM', size: 8, fill: 'ink', frames: [{ t: 0, x: 172, y: 47 }] },
    // El sillón.
    {
      kind: 'rect',
      w: 100,
      h: 27,
      r: 5,
      fill: 'sun',
      stroke: 'wood',
      sw: 1.2,
      frames: [{ t: 0, x: 100, y: 102 }],
    },
    {
      kind: 'rect',
      w: 104,
      h: 12,
      r: 3,
      fill: 'sun',
      stroke: 'wood',
      sw: 1.2,
      frames: [{ t: 0, x: 100, y: 121 }],
    },
    {
      kind: 'rect',
      w: 10,
      h: 22,
      r: 3,
      fill: 'sun',
      stroke: 'wood',
      sw: 1.2,
      frames: [{ t: 0, x: 49, y: 112 }],
    },
    {
      kind: 'rect',
      w: 10,
      h: 22,
      r: 3,
      fill: 'sun',
      stroke: 'wood',
      sw: 1.2,
      frames: [{ t: 0, x: 151, y: 112 }],
    },
    {
      kind: 'path',
      d: 'M-46 0 V3 M46 0 V3',
      fill: 'none',
      stroke: 'wood',
      sw: 3,
      frames: [{ t: 0, x: 100, y: 127 }],
    },
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        // Pregunta (mano abierta) y después escucha, asintiendo.
        { t: 0, ...A },
        { t: 0.04, ...A, ra: [60, 130] },
        { t: 0.12, ...A, ra: [55, 120], head: 6 },
        { t: 0.2, ...A, ra: [60, 130] },
        { t: 0.26, ...A },
        { t: 0.34, ...A, head: 8 },
        { t: 0.42, ...A },
        { t: 0.5, ...A, head: 8 },
        { t: 0.58, ...A },
        { t: 0.7, ...A, ra: [70, 160] },
        { t: 0.82, ...A, ra: [70, 160], head: 8 },
        { t: 0.9, ...A },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: teen,
      frames: [
        { t: 0, ...T },
        { t: 0.2, ...T },
        // Cuenta, moviendo la mano.
        { t: 0.27, ...T, la: [-50, -110] },
        { t: 0.34, ...T, la: [-60, -140] },
        { t: 0.41, ...T, la: [-50, -110] },
        { t: 0.48, ...T, la: [-60, -140], head: -6 },
        { t: 0.55, ...T, la: [-50, -110] },
        { t: 0.62, ...T },
        // Propone una meta: levanta el dedo.
        { t: 0.67, ...T, la: [-150, -170] },
        { t: 0.82, ...T, la: [-150, -170] },
        { t: 0.88, ...T },
      ],
    },
    // Globo del adulto: la pregunta.
    {
      kind: 'path',
      d: bubble(22, 'right'),
      fill: 'cream',
      stroke: 'muted',
      sw: 1.4,
      frames: shown(60, 52, 0.02, 0.3),
    },
    { kind: 'text', text: '?', size: 12, fill: 'sky', frames: shown(60, 56, 0.02, 0.3) },
    // Globo del adolescente, con lo que cuenta.
    {
      kind: 'path',
      d: bubble(24, 'left'),
      fill: 'cream',
      stroke: 'muted',
      sw: 1.4,
      frames: shown(140, 57, 0.22, 0.86),
    },
    ...goodApp,
    ...sadApp,
    ...goal,
  ],
};

export default scene;
