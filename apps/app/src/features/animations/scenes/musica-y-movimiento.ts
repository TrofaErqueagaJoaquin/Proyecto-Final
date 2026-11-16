import type { Pose, Scene, ShapeElement } from '../engine';
import { jump, oneFoot, stand } from '../poses';

// Música y movimiento: bailan con la radio; cuando la música para, quedan quietos como estatuas;
// vuelve la música y se mueven como animales (el adulto aletea como un pájaro, el chico salta
// como una rana).
const k = 0.7;
const A = 92; // adulto
const C = 150; // chico
const MUSIC_OFF = { from: 0.36, to: 0.56 };

const danceA = (x: number, s = 1): Pose => ({
  ...stand(x, s),
  torso: -8,
  la: [-150, -170],
  ra: [60, 120],
  ll: [-14, -4],
  rl: [20, -20],
});
const danceB = (x: number, s = 1): Pose => ({
  ...stand(x, s),
  torso: 8,
  la: [-60, -120],
  ra: [150, 170],
  ll: [-20, 20],
  rl: [14, 4],
});
// Estatuas: el adulto en un pie con los brazos abiertos; el chico con los brazos arriba.
const statueAdult: Pose = { ...oneFoot(A), la: [-120, -150], ra: [90, 60] };
const statueKid: Pose = {
  ...stand(C, k),
  torso: 6,
  la: [-150, -175],
  ra: [150, 120],
  rl: [30, 90],
};
// Pájaro: aletea con los brazos abiertos.
const wingsUp: Pose = { ...stand(A), la: [-115, -130], ra: [115, 130] };
const wingsDown: Pose = { ...stand(A), y: stand(A).y + 1, la: [-65, -50], ra: [65, 50] };
// Para pasar de la estatua a la rana se agacha primero (así los pies no atraviesan el piso).
const crouchKid: Pose = {
  x: C - 3,
  y: 118,
  torso: 20,
  head: -5,
  la: [10, 0],
  ra: [25, 10],
  ll: [-90, 10],
  rl: [90, -5],
};
// Rana: agachada con las manos cerca del piso, y en el aire.
const frog = (x: number): Pose => ({
  x,
  y: 125,
  torso: 35,
  head: -15,
  la: [15, 5],
  ra: [30, 10],
  ll: [-120, 15],
  rl: [112, -25],
});

const note = (delay: number, dx: number, fill: 'violet' | 'coral' | 'sky'): ShapeElement => ({
  kind: 'path',
  d: 'M-2.6 0 a2.6 2 0 1 0 5.2 0 a2.6 2 0 1 0 -5.2 0 M2.6 0 V-9 L6.5 -6.5',
  fill,
  stroke: fill,
  sw: 1.4,
  frames: [
    { t: 0, x: 40, y: 104, o: 0, s: 0.7 },
    { t: delay, x: 40, y: 104, o: 0, s: 0.7 },
    { t: delay + 0.05, x: 44 + dx, y: 90, o: 1, s: 1 },
    { t: delay + 0.16, x: 48 + dx, y: 66, o: 1, s: 1.2 },
    { t: delay + 0.22, x: 50 + dx, y: 54, o: 0, s: 1.2 },
    { t: 0.99, x: 50 + dx, y: 54, o: 0, s: 1.2 },
  ],
});

const scene: Scene = {
  duration: 9000,
  still: 0.12,
  bg: 'mint',
  elements: [
    // Radio en el piso.
    { kind: 'line', x2: 9, y2: -16, stroke: 'muted', sw: 1.6, frames: [{ t: 0, x: 36, y: 112 }] },
    { kind: 'rect', w: 28, h: 18, r: 3, fill: 'sky', frames: [{ t: 0, x: 28, y: 121 }] },
    {
      kind: 'circle',
      r: 5.5,
      fill: 'cream',
      stroke: 'ink',
      sw: 1.5,
      frames: [{ t: 0, x: 22, y: 121 }],
    },
    { kind: 'circle', r: 1.8, fill: 'ink', frames: [{ t: 0, x: 34, y: 118 }] },
    { kind: 'circle', r: 1.8, fill: 'ink', frames: [{ t: 0, x: 34, y: 124.5 }] },
    // Notas cuando suena la música (se cortan para la estatua).
    note(0, 0, 'violet'),
    note(0.07, 8, 'coral'),
    note(0.14, -2, 'sky'),
    note(0.58, 6, 'coral'),
    note(0.66, -3, 'violet'),
    note(0.74, 9, 'sky'),
    // Pausa en la radio y el cartel de "estatua".
    ...[-2.5, 2.5].map((dx): ShapeElement => ({
      kind: 'rect',
      w: 2.4,
      h: 7,
      fill: 'ink',
      frames: [
        { t: 0, x: 22 + dx, y: 121, o: 0 },
        { t: MUSIC_OFF.from, x: 22 + dx, y: 121, o: 0 },
        { t: MUSIC_OFF.from + 0.02, x: 22 + dx, y: 121, o: 1 },
        { t: MUSIC_OFF.to, x: 22 + dx, y: 121, o: 1 },
        { t: MUSIC_OFF.to + 0.02, x: 22 + dx, y: 121, o: 0 },
      ],
    })),
    {
      kind: 'text',
      text: '¡Estatua!',
      size: 12,
      fill: 'coral',
      frames: [
        { t: 0, x: 120, y: 30, o: 0, s: 0.6 },
        { t: MUSIC_OFF.from + 0.01, x: 120, y: 30, o: 0, s: 0.6 },
        { t: MUSIC_OFF.from + 0.04, x: 120, y: 30, o: 1, s: 1 },
        { t: MUSIC_OFF.to - 0.02, x: 120, y: 30, o: 1, s: 1 },
        { t: MUSIC_OFF.to + 0.01, x: 120, y: 30, o: 0, s: 1 },
      ],
    },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...danceA(A) },
        { t: 0.06, ...danceB(A) },
        { t: 0.12, ...danceA(A) },
        { t: 0.18, ...danceB(A) },
        { t: 0.24, ...danceA(A) },
        { t: 0.3, ...danceB(A) },
        { t: 0.36, ...statueAdult },
        { t: 0.56, ...statueAdult },
        { t: 0.62, ...wingsUp },
        { t: 0.67, ...wingsDown },
        { t: 0.72, ...wingsUp },
        { t: 0.77, ...wingsDown },
        { t: 0.82, ...wingsUp },
        { t: 0.87, ...wingsDown },
        { t: 0.94, ...danceB(A) },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...danceB(C, k) },
        { t: 0.06, ...danceA(C, k) },
        { t: 0.12, ...danceB(C, k) },
        { t: 0.18, ...danceA(C, k) },
        { t: 0.24, ...danceB(C, k) },
        { t: 0.3, ...danceA(C, k) },
        { t: 0.36, ...statueKid },
        { t: 0.56, ...statueKid },
        { t: 0.59, ...crouchKid },
        { t: 0.62, ...frog(C - 6) },
        { t: 0.67, ...jump(C, k) },
        { t: 0.72, ...frog(C + 4) },
        { t: 0.77, ...jump(C, k) },
        { t: 0.82, ...frog(C - 6) },
        { t: 0.87, ...jump(C, k) },
        { t: 0.94, ...danceA(C, k) },
      ],
    },
  ],
};

export default scene;
