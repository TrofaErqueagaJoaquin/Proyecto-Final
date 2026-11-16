import type { Keyframe, Motion, Pose, Scene, ShapeElement } from '../engine';
import { sitChair, stand, walkA, walkB } from '../poses';

// Rutina para dormir: el chico apaga la tablet (que "duerme" en el estante), se lava los dientes y
// se acuesta; el adulto le lee un cuento y baja la luz. El cartel marca cada paso.
const k = 0.7;

// Chico: lavándose los dientes (la mano va y viene frente a la boca).
const brushA: Pose = { ...stand(44, k), ra: [54, -168] };
const brushB: Pose = { ...stand(44, k), ra: [62, -148] };
// Sentado en la cama (piernas hacia los pies de la cama) y acostado, con la cabeza en la almohada.
const sitBed: Pose = {
  ...stand(100, k),
  y: 104,
  la: [-60, -90],
  ra: [-40, -80],
  ll: [-88, -92],
  rl: [-92, -95],
};
const lie: Pose = { ...sitBed, y: 103, torso: 88, la: [-80, -95], ra: [-70, -90] };

// Adulto en la silla, mirando a la cama: con el libro en la falda o leyendo.
const seated: Pose = { ...sitChair(165), ll: [-88, 0], rl: [-92, -2] };
const lap: Pose = { ...seated, la: [-15, -46], ra: [-1, -43] };
const read: Pose = { ...seated, la: [-39, -120], ra: [-20, -121] };

/** Visible entre `from` y `to` (con fundido corto). */
const shown = (
  x: number,
  y: number,
  from: number,
  to: number,
  o = 1,
): Keyframe<Partial<Motion>>[] => [
  { t: 0, x, y, o: 0 },
  { t: from, x, y, o: 0 },
  { t: from + 0.03, x, y, o },
  { t: to, x, y, o },
  { t: to + 0.03, x, y, o: 0 },
];

const openBook = 'M0 -4 L-7 -6 L-7 5 L0 7 L7 5 L7 -6 Z M0 -4 L0 7';
const moon = 'M1.5 -5 A5.5 5.5 0 1 0 1.5 5 A4 4 0 1 1 1.5 -5 Z';

// El cartel con los pasos: pantallas apagadas, dientes, cuento y luz baja.
const STEP_X = [21, 39, 57, 75];
const poster: ShapeElement[] = [
  {
    kind: 'rect',
    w: 74,
    h: 24,
    r: 4,
    fill: 'cream',
    stroke: 'muted',
    sw: 1.4,
    frames: [{ t: 0, x: 48, y: 22 }],
  },
  { kind: 'rect', w: 7, h: 11, r: 1.5, fill: 'ink', frames: [{ t: 0, x: STEP_X[0]!, y: 22 }] },
  {
    kind: 'line',
    x2: 10,
    y2: 12,
    stroke: 'coral',
    sw: 1.8,
    frames: [{ t: 0, x: STEP_X[0]! - 5, y: 16 }],
  },
  {
    kind: 'line',
    x2: 8,
    y2: -8,
    stroke: 'sky',
    sw: 2.2,
    frames: [{ t: 0, x: STEP_X[1]! - 5, y: 27 }],
  },
  {
    kind: 'rect',
    w: 3.5,
    h: 6,
    r: 1,
    fill: 'cream',
    stroke: 'sky',
    sw: 1.2,
    frames: [{ t: 0, x: STEP_X[1]! + 4, y: 17, rot: 45 }],
  },
  {
    kind: 'path',
    d: openBook,
    fill: 'cream',
    stroke: 'violet',
    sw: 1.4,
    frames: [{ t: 0, x: STEP_X[2]!, y: 21.5 }],
  },
  { kind: 'path', d: moon, fill: 'sun', frames: [{ t: 0, x: STEP_X[3]!, y: 22 }] },
  // Recuadro que marca el paso de ahora.
  {
    kind: 'rect',
    w: 16,
    h: 19,
    r: 3,
    fill: 'none',
    stroke: 'coral',
    sw: 1.6,
    frames: [
      { t: 0, x: STEP_X[0]!, y: 22 },
      { t: 0.07, x: STEP_X[0]!, y: 22 },
      { t: 0.1, x: STEP_X[1]!, y: 22 },
      { t: 0.44, x: STEP_X[1]!, y: 22 },
      { t: 0.48, x: STEP_X[2]!, y: 22 },
      { t: 0.72, x: STEP_X[2]!, y: 22 },
      { t: 0.75, x: STEP_X[3]!, y: 22 },
      { t: 0.88, x: STEP_X[3]!, y: 22 },
      { t: 0.94, x: STEP_X[0]!, y: 22 },
    ],
  },
];

/** Una "z" que sube desde la cabeza del que duerme. */
const zz = (delay: number, size: number): ShapeElement => ({
  kind: 'text',
  text: 'z',
  size,
  fill: 'violet',
  frames: [
    { t: 0, x: 128, y: 94, o: 0 },
    { t: delay, x: 128, y: 94, o: 0 },
    { t: delay + 0.03, x: 131, y: 88, o: 1 },
    { t: delay + 0.08, x: 136, y: 80, o: 0 },
  ],
});

const scene: Scene = {
  duration: 9000,
  still: 0.6,
  bg: 'sky',
  elements: [
    ...poster,
    // Ventana: de día y de noche (con la luna).
    {
      kind: 'rect',
      w: 30,
      h: 24,
      r: 2,
      fill: 'sky',
      stroke: 'wood',
      sw: 2,
      frames: [{ t: 0, x: 128, y: 40, o: 0.6 }],
    },
    { kind: 'rect', w: 28, h: 22, r: 1, fill: 'violet', frames: shown(128, 40, 0.73, 0.88, 0.7) },
    { kind: 'path', d: moon, fill: 'sun', frames: shown(132, 38, 0.73, 0.88) },
    { kind: 'line', x2: 0, y2: 22, stroke: 'wood', sw: 1.5, frames: [{ t: 0, x: 128, y: 29 }] },
    // Estante con la tablet: se apaga y queda "durmiendo".
    { kind: 'line', x2: 24, y2: 0, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 13, y: 83 }] },
    { kind: 'rect', w: 11, h: 7, r: 1.2, fill: 'ink', frames: [{ t: 0, x: 25, y: 78 }] },
    {
      kind: 'rect',
      w: 8.5,
      h: 4.5,
      r: 0.8,
      fill: 'sky',
      frames: [
        { t: 0, x: 25, y: 78, o: 1 },
        { t: 0.05, x: 25, y: 78, o: 1 },
        { t: 0.07, x: 25, y: 78, o: 0 },
        { t: 0.95, x: 25, y: 78, o: 0 },
      ],
    },
    { kind: 'text', text: 'z', size: 8, fill: 'muted', frames: shown(33, 72, 0.08, 0.9) },
    // Cama con almohada.
    { kind: 'rect', w: 4, h: 40, r: 2, fill: 'wood', frames: [{ t: 0, x: 140, y: 110 }] },
    { kind: 'rect', w: 84, h: 7, r: 2, fill: 'wood', frames: [{ t: 0, x: 98, y: 118.5 }] },
    { kind: 'line', x2: 0, y2: 8, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 60, y: 122 }] },
    {
      kind: 'rect',
      w: 82,
      h: 7,
      r: 2,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 98, y: 111 }],
    },
    {
      kind: 'ellipse',
      rx: 9,
      ry: 3.5,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 127, y: 104.5 }],
    },
    // Silla del adulto.
    { kind: 'line', x2: -1, y2: 15, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 158, y: 115 }] },
    { kind: 'line', x2: 1, y2: 15, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 173, y: 115 }] },
    { kind: 'line', x2: 0, y2: -30, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 174, y: 114 }] },
    { kind: 'rect', w: 20, h: 3.5, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 166, y: 114 }] },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...stand(44, k) },
        // Apaga la tablet del estante.
        { t: 0.04, ...stand(44, k), la: [-110, -114] },
        { t: 0.08, ...stand(44, k) },
        { t: 0.11, ...brushA },
        { t: 0.14, ...brushB },
        { t: 0.17, ...brushA },
        { t: 0.2, ...brushB },
        { t: 0.23, ...brushA },
        { t: 0.27, ...stand(44, k) },
        { t: 0.31, ...walkA(60, k) },
        { t: 0.35, ...walkB(76, k) },
        { t: 0.39, ...stand(90, k) },
        { t: 0.43, ...sitBed },
        { t: 0.48, ...lie },
        { t: 0.86, ...lie },
        { t: 0.89, ...sitBed },
        { t: 0.92, ...stand(90, k) },
        { t: 0.96, ...walkA(66, k) },
      ],
    },
    // Cepillo de dientes.
    {
      kind: 'line',
      x2: -7,
      y2: -1,
      stroke: 'sky',
      sw: 2,
      frames: [
        { t: 0, x: 50, y: 84, o: 0 },
        { t: 0.09, x: 50, y: 84, o: 0 },
        { t: 0.11, x: 50, y: 84, o: 1 },
        { t: 0.14, x: 47.8, y: 84, o: 1 },
        { t: 0.17, x: 50, y: 84, o: 1 },
        { t: 0.2, x: 47.8, y: 84, o: 1 },
        { t: 0.23, x: 50, y: 84, o: 1 },
        { t: 0.26, x: 48, y: 90, o: 0 },
      ],
    },
    // Frazada.
    { kind: 'rect', w: 44, h: 9, r: 3, fill: 'sun', frames: shown(96, 104.5, 0.45, 0.86) },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...lap },
        { t: 0.47, ...lap },
        { t: 0.52, ...read },
        { t: 0.6, ...read, head: -6 },
        { t: 0.68, ...read },
        { t: 0.76, ...lap },
      ],
    },
    // El libro del cuento.
    {
      kind: 'path',
      d: openBook,
      fill: 'cream',
      stroke: 'violet',
      sw: 1.4,
      frames: [
        { t: 0, x: 154, y: 101, s: 0.8 },
        { t: 0.47, x: 154, y: 101, s: 0.8 },
        { t: 0.52, x: 146, y: 83, s: 1 },
        { t: 0.6, x: 146, y: 83, s: 1, rot: -6 },
        { t: 0.68, x: 146, y: 83, s: 1 },
        { t: 0.76, x: 154, y: 101, s: 0.8 },
      ],
    },
    // Luz baja: todo se oscurece un poco y el chico duerme.
    {
      kind: 'rect',
      w: 200,
      h: 150,
      r: 18,
      fill: 'violet',
      frames: shown(100, 75, 0.73, 0.88, 0.14),
    },
    zz(0.76, 9),
    zz(0.81, 11),
  ],
};

export default scene;
