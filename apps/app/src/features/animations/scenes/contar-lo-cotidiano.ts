import type { Keyframe, Motion, Pose, Scene } from '../engine';
import { sitChair, stand } from '../poses';

// Contar lo cotidiano: un adulto lava un tomate y cuenta lo que hace; el bebé, en la sillita,
// responde "¡agua!" y el adulto lo repite y lo amplía.
const baby = 0.55;

/** Globo de diálogo centrado en (0, 0), con la punta en (tx, ty). */
const bubble = (w: number, h: number, tx: number, ty: number) => {
  const x = w / 2;
  const y = h / 2;
  const r = 5;
  const b = Math.sign(tx) * Math.min(Math.abs(tx), x - r - 4);
  return `M${-x + r} ${-y} H${x - r} Q${x} ${-y} ${x} ${-y + r} V${y - r} Q${x} ${y} ${x - r} ${y} H${b + 3} L${tx} ${ty} L${b - 3} ${y} H${-x + r} Q${-x} ${y} ${-x} ${y - r} V${-y + r} Q${-x} ${-y} ${-x + r} ${-y} Z`;
};

/** Aparece en `from` y desaparece en `to`. */
const shown = (x: number, y: number, from: number, to: number): Keyframe<Partial<Motion>>[] => [
  { t: 0, x, y, o: 0 },
  { t: from, x, y, o: 0 },
  { t: from + 0.03, x, y, o: 1 },
  { t: to, x, y, o: 1 },
  { t: to + 0.03, x, y, o: 0 },
];

// El adulto lava con las dos manos bajo la canilla (dos posiciones que se alternan).
const washA: Pose = { ...stand(70), la: [-66, -34], ra: [-74, -11] };
const washB: Pose = { ...stand(70), la: [-60, -30], ra: [-80, -16] };
// Se vuelve hacia el bebé y le habla con la mano abierta (la otra sigue en la pileta).
const talk: Pose = { ...stand(70), torso: 6, la: [-55, -52], ra: [70, 100] };

// Bebé sentado mirando a la izquierda, con las manos en la bandeja.
const seated: Pose = {
  ...sitChair(150, baby),
  y: 99,
  ll: [-88, 0],
  rl: [-92, -2],
  la: [-35, -85],
  ra: [-45, -90],
};
const excited: Pose = { ...seated, la: [-140, -160], ra: [-110, -130] };

const tomato = (t: number, x: number, y: number): Keyframe<Partial<Motion>> => ({ t, x, y });

const scene: Scene = {
  duration: 8000,
  still: 0.66,
  bg: 'coral',
  elements: [
    // Mesada con la canilla y el chorro de agua.
    { kind: 'rect', w: 46, h: 35, r: 2, fill: 'wood', frames: [{ t: 0, x: 35, y: 112.5 }] },
    { kind: 'rect', w: 50, h: 4, r: 2, fill: 'muted', frames: [{ t: 0, x: 35, y: 95 }] },
    {
      kind: 'path',
      d: 'M0 0 V-13 Q0 -17 4 -17 H8 V-14',
      fill: 'none',
      stroke: 'muted',
      sw: 2.5,
      frames: [{ t: 0, x: 40, y: 93 }],
    },
    {
      kind: 'line',
      x2: 0,
      y2: 11,
      stroke: 'sky',
      sw: 2.4,
      frames: [{ t: 0, x: 48, y: 81, o: 0.85 }],
    },
    // Sillita alta.
    { kind: 'line', x2: -5, y2: 27, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 142, y: 103 }] },
    { kind: 'line', x2: 5, y2: 27, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 156, y: 103 }] },
    { kind: 'rect', w: 20, h: 3.5, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 149, y: 101 }] },
    { kind: 'rect', w: 3.5, h: 24, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 157.5, y: 89 }] },
    { kind: 'line', x2: 0, y2: 9, stroke: 'wood', sw: 2, frames: [{ t: 0, x: 138, y: 92 }] },
    { kind: 'rect', w: 14, h: 3, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 137, y: 91.5 }] },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...washA },
        { t: 0.08, ...washB },
        { t: 0.16, ...washA },
        { t: 0.24, ...washB },
        { t: 0.32, ...washA },
        { t: 0.46, ...washA },
        { t: 0.54, ...talk },
        { t: 0.66, ...talk, ra: [80, 110] },
        { t: 0.8, ...talk },
        { t: 0.9, ...washB },
      ],
    },
    // El tomate entre las manos, bajo el chorro.
    {
      kind: 'circle',
      r: 3.6,
      fill: 'coral',
      stroke: 'leaf',
      sw: 1.2,
      frames: [
        tomato(0, 52, 86),
        tomato(0.08, 51, 85),
        tomato(0.16, 52, 86),
        tomato(0.24, 51, 85),
        tomato(0.32, 52, 86),
        tomato(0.46, 52, 86),
        tomato(0.54, 51.5, 85.5),
        tomato(0.8, 51.5, 85.5),
        tomato(0.9, 51, 85),
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: baby,
      frames: [
        { t: 0, ...seated },
        { t: 0.34, ...seated },
        { t: 0.4, ...excited },
        { t: 0.46, ...excited, la: [-130, -150] },
        { t: 0.52, ...excited },
        { t: 0.62, ...seated, head: 6 },
        { t: 0.8, ...seated, head: 6 },
        { t: 0.88, ...seated },
      ],
    },
    // El adulto cuenta lo que hace (globo con renglones).
    {
      kind: 'path',
      d: bubble(52, 18, -14, 17),
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: shown(92, 30, 0.03, 0.3),
    },
    {
      kind: 'path',
      d: 'M-17 -3 H5 M10 -3 H17 M-17 4 H-6 M-1 4 H9',
      fill: 'none',
      stroke: 'muted',
      sw: 2,
      frames: shown(92, 30, 0.03, 0.3),
    },
    // El bebé responde.
    {
      kind: 'path',
      d: bubble(38, 16, -12, 16),
      fill: 'cream',
      stroke: 'violet',
      sw: 1.6,
      frames: shown(166, 54, 0.38, 0.82),
    },
    { kind: 'text', text: '¡agua!', size: 9, fill: 'violet', frames: shown(166, 57, 0.38, 0.82) },
    // El adulto repite y amplía.
    {
      kind: 'path',
      d: bubble(60, 18, -10, 17),
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: shown(96, 30, 0.56, 0.84),
    },
    {
      kind: 'text',
      text: '¡agua fría!',
      size: 9,
      fill: 'coral',
      frames: shown(96, 33, 0.56, 0.84),
    },
  ],
};

export default scene;
