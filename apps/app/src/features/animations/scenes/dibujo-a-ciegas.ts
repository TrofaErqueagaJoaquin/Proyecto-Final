import type { Keyframe, Motion, Pose, Scene } from '../engine';
import { sitChair, stand } from '../poses';

// Dibujo a ciegas: de espaldas, el adulto describe la tarjeta ("un cuadrado", "un triángulo") y el
// chico dibuja sin verla; al final comparan la tarjeta con el dibujo.
const k = 0.7;

/** Globo de diálogo centrado en (0, 0), con la punta en (tx, ty). */
const bubble = (w: number, h: number, tx: number, ty: number) => {
  const x = w / 2;
  const y = h / 2;
  const r = 5;
  const b = Math.sign(tx) * Math.min(Math.abs(tx), x - r - 4);
  return `M${-x + r} ${-y} H${x - r} Q${x} ${-y} ${x} ${-y + r} V${y - r} Q${x} ${y} ${x - r} ${y} H${b + 3} L${tx} ${ty} L${b - 3} ${y} H${-x + r} Q${-x} ${y} ${-x} ${y - r} V${-y + r} Q${-x} ${-y} ${-x + r} ${-y} Z`;
};

/** Visible entre `from` y `to` (con fundido corto). */
const shown = (x: number, y: number, from: number, to: number): Keyframe<Partial<Motion>>[] => [
  { t: 0, x, y, o: 0 },
  { t: from, x, y, o: 0 },
  { t: from + 0.03, x, y, o: 1 },
  { t: to, x, y, o: 1 },
  { t: to + 0.03, x, y, o: 0 },
];

// Adulto sentado mirando a la izquierda, con la tarjeta adelante; después gira el torso y la
// levanta para mostrarla (las piernas quedan donde están).
const seated: Pose = { ...sitChair(100), ll: [-88, 0], rl: [-92, -2] };
const holdCard: Pose = { ...seated, la: [-51, -136], ra: [-40, -129] };
const liftCard: Pose = { ...seated, la: [-170, 175], ra: [170, -175] };
const showCard: Pose = { ...seated, torso: 8, la: [165, 72], ra: [163, 86] };

// La tarjeta: a la izquierda, arriba de la cabeza (al girar) y a la derecha, mostrándola.
const CARD: [number, number, number][] = [
  [0, 72, 79],
  [0.64, 72, 79],
  [0.68, 100, 50],
  [0.72, 124, 64],
  [0.9, 124, 64],
  [0.94, 100, 50],
  [0.98, 72, 79],
];
const card = (dy = 0): Keyframe<Partial<Motion>>[] =>
  CARD.map(([t, x, y]) => ({ t, x, y: y + dy }));

// Chico parado frente al atril, de espaldas al adulto: la mano recorre el cuadrado y el techo.
const draw = (ra: [number, number]): Pose => ({ ...stand(146, k), ra });
const HAND: [number, [number, number], number, number][] = [
  [0, [-7, 115], 153, 93],
  [0.12, [-7, 115], 153, 93],
  [0.15, [52, -175], 153, 84],
  [0.19, [77, 125], 163, 84],
  [0.23, [88, 52], 163, 93],
  [0.27, [-7, 115], 153, 93],
  [0.31, [52, -175], 153, 84],
  [0.4, [54, -168], 152, 84],
  [0.46, [98, 165], 158, 77],
  [0.52, [85, 115], 164, 84],
  [0.58, [-7, 115], 153, 93],
];

const scene: Scene = {
  duration: 8000,
  still: 0.48,
  bg: 'sun',
  elements: [
    // Banquito del adulto.
    { kind: 'line', x2: -3, y2: 15, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 94, y: 115 }] },
    { kind: 'line', x2: 3, y2: 15, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 106, y: 115 }] },
    { kind: 'rect', w: 18, h: 3.5, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 100, y: 114 }] },
    // Atril con la hoja.
    { kind: 'line', x2: -6, y2: 32, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 152, y: 98 }] },
    { kind: 'line', x2: 6, y2: 32, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 168, y: 98 }] },
    {
      kind: 'rect',
      w: 26,
      h: 30,
      r: 2,
      fill: 'cream',
      stroke: 'wood',
      sw: 2,
      frames: [{ t: 0, x: 160, y: 85 }],
    },
    // Lo que va dibujando: primero el cuadrado, después el techo (un poco torcido).
    {
      kind: 'path',
      d: 'M-5 -4.5 H5 V4.5 H-5 Z',
      fill: 'none',
      stroke: 'coral',
      sw: 1.8,
      frames: [
        { t: 0, x: 158, y: 88.5, o: 0 },
        { t: 0.14, x: 158, y: 88.5, o: 0 },
        { t: 0.3, x: 158, y: 88.5, o: 1 },
        { t: 0.92, x: 158, y: 88.5, o: 1 },
        { t: 0.96, x: 158, y: 88.5, o: 0 },
      ],
    },
    {
      kind: 'path',
      d: 'M-6 3.5 L0 -3.5 L6 3.5',
      fill: 'none',
      stroke: 'coral',
      sw: 1.8,
      frames: [
        { t: 0, x: 158.5, y: 80.5, rot: 8, o: 0 },
        { t: 0.4, x: 158.5, y: 80.5, rot: 8, o: 0 },
        { t: 0.54, x: 158.5, y: 80.5, rot: 8, o: 1 },
        { t: 0.92, x: 158.5, y: 80.5, rot: 8, o: 1 },
        { t: 0.96, x: 158.5, y: 80.5, rot: 8, o: 0 },
      ],
    },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...holdCard },
        { t: 0.1, ...holdCard, head: -6 },
        { t: 0.2, ...holdCard },
        { t: 0.38, ...holdCard, head: -6 },
        { t: 0.48, ...holdCard },
        { t: 0.64, ...holdCard },
        { t: 0.68, ...liftCard },
        { t: 0.72, ...showCard },
        { t: 0.9, ...showCard },
        { t: 0.94, ...liftCard },
        { t: 0.98, ...holdCard },
      ],
    },
    // La tarjeta con la casita.
    { kind: 'rect', w: 18, h: 16, r: 2, fill: 'cream', stroke: 'muted', sw: 1.4, frames: card() },
    {
      kind: 'path',
      d: 'M-4 -1 H4 V5.5 H-4 Z M-5.5 -1 L0 -6 L5.5 -1',
      fill: 'none',
      stroke: 'coral',
      sw: 1.4,
      frames: card(),
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        ...HAND.map(([t, ra]) => ({ t, ...draw(ra) })),
        // Se da vuelta para comparar: señala la tarjeta.
        { t: 0.66, ...draw([-7, 115]), la: [-130, -140] as [number, number] },
        { t: 0.9, ...draw([-7, 115]), la: [-130, -140] as [number, number] },
        { t: 0.95, ...draw([-7, 115]) },
      ],
    },
    // El lápiz en la mano del chico.
    {
      kind: 'line',
      x2: 3,
      y2: -6,
      stroke: 'sun',
      sw: 2.2,
      frames: HAND.map(([t, , x, y]) => ({ t, x, y })),
    },
    // Lo que dice el adulto.
    {
      kind: 'path',
      d: bubble(68, 16, 28, 22),
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: shown(62, 40, 0.06, 0.3),
    },
    { kind: 'text', text: 'un cuadrado', size: 9, fill: 'coral', frames: shown(62, 43, 0.06, 0.3) },
    {
      kind: 'path',
      d: bubble(68, 16, 28, 22),
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: shown(62, 40, 0.35, 0.58),
    },
    {
      kind: 'text',
      text: 'un triángulo',
      size: 9,
      fill: 'coral',
      frames: shown(62, 43, 0.35, 0.58),
    },
    {
      kind: 'text',
      text: '¡casi igual!',
      size: 11,
      fill: 'coral',
      frames: shown(104, 34, 0.73, 0.9),
    },
  ],
};

export default scene;
