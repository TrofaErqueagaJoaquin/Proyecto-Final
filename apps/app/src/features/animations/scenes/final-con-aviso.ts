import type { Pose, Scene, ShapeElement } from '../engine';
import { holdFront, stand, walkA, walkB } from '../poses';

// Final con aviso: el adulto avisa "5 min" señalando el reloj; el chico va y apaga la tele él
// mismo, y lo espera una actividad puente: jugar a la pelota con el adulto.
const k = 0.7;
const TV = { x: 38, y: 95 };

/** La misma pose mirando hacia el otro lado. */
const flip = (p: Pose): Pose => ({
  ...p,
  torso: -p.torso,
  head: -(p.head ?? 0),
  la: [-p.la[0], -p.la[1]],
  ra: [-p.ra[0], -p.ra[1]],
  ll: [-p.ll[0], -p.ll[1]],
  rl: [-p.rl[0], -p.rl[1]],
});

// Chico sentado en el piso mirando la tele (a la izquierda).
const watching: Pose = {
  x: 92,
  y: 127.3,
  torso: 4,
  la: [-20, -60],
  ra: [-35, -75],
  ll: [-80, -95],
  rl: [-85, -92],
};
// Para levantarse (y volver a sentarse) sin que los pies atraviesen el piso: primero junta las
// rodillas, después se para desde cuclillas (con las dos rodillas hacia la tele) y se endereza.
const kneesUp: Pose = { ...watching, torso: -6, ll: [-136, -22], rl: [-132, -18] };
const halfUp = (x: number): Pose => ({
  x,
  y: 114,
  torso: -22,
  head: 6,
  la: [-35, -20],
  ra: [-45, -30],
  ll: [-52, 40],
  rl: [-48, 42],
});
const almostUp = (x: number): Pose => ({
  x,
  y: 110,
  torso: -10,
  head: 3,
  la: [-25, -15],
  ra: [-30, -20],
  ll: [-25, 15],
  rl: [-21, 17],
});
// Inclinado hacia la tele, con el dedo en el botón.
const pressing: Pose = { ...stand(72, k), torso: -20, la: [-14, -8], ra: [-40, -34] };
// El adulto avisa señalando el reloj de la pared.
const pointing: Pose = { ...stand(132), la: [-142, -142] };
const holding = flip(holdFront(162));
const tossing: Pose = { ...holding, la: [-110, -150], ra: [-120, -160] };

const ball = (x: number, y: number, o = 1) => ({ x, y, o });
const screenOff = (o: number) => ({ ...TV, o });

const tick: ShapeElement = {
  kind: 'line',
  x2: 0,
  y2: -6.5,
  stroke: 'ink',
  sw: 1.6,
  frames: [
    ...Array.from({ length: 12 }, (_, i) => ({ t: i / 12, x: 100, y: 30, rot: i * 30 })),
    { t: 1, x: 100, y: 30, rot: 360 },
  ],
};

const scene: Scene = {
  duration: 9000,
  still: 0.55,
  bg: 'sky',
  elements: [
    // Reloj en la pared.
    {
      kind: 'circle',
      r: 10,
      fill: 'cream',
      stroke: 'ink',
      sw: 2,
      frames: [{ t: 0, x: 100, y: 30 }],
    },
    { kind: 'line', x2: 4, y2: 0, stroke: 'ink', sw: 1.8, frames: [{ t: 0, x: 100, y: 30 }] },
    tick,
    // Mueble y tele, con un dibujito en la pantalla mientras está prendida.
    { kind: 'rect', w: 48, h: 20, r: 2, fill: 'wood', frames: [{ t: 0, x: TV.x, y: 120 }] },
    { kind: 'rect', w: 8, h: 3, fill: 'ink', frames: [{ t: 0, x: TV.x, y: 109.5 }] },
    {
      kind: 'rect',
      w: 44,
      h: 28,
      r: 3,
      fill: 'sky',
      stroke: 'ink',
      sw: 2.4,
      frames: [{ t: 0, ...TV }],
    },
    { kind: 'path', d: 'M-19 12 Q-6 0 8 12 Z', fill: 'leaf', frames: [{ t: 0, ...TV }] },
    {
      kind: 'circle',
      r: 3.5,
      fill: 'sun',
      frames: [
        { t: 0, x: TV.x - 8, y: TV.y - 4 },
        { t: 0.25, x: TV.x + 10, y: TV.y - 7 },
        { t: 0.5, x: TV.x - 8, y: TV.y - 4 },
        { t: 0.75, x: TV.x + 10, y: TV.y - 7 },
      ],
    },
    // Pantalla apagada (tapa el dibujito).
    {
      kind: 'rect',
      w: 41.6,
      h: 25.6,
      r: 2,
      fill: 'night',
      frames: [
        { t: 0, ...screenOff(0) },
        { t: 0.51, ...screenOff(0) },
        { t: 0.54, ...screenOff(0.92) },
        { t: 0.95, ...screenOff(0.92) },
        { t: 0.99, ...screenOff(0) },
      ],
    },
    // Botón de encendido.
    { kind: 'circle', r: 1.8, fill: 'coral', frames: [{ t: 0, x: TV.x + 17, y: TV.y + 11 }] },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...watching },
        { t: 0.2, ...watching, head: 10 },
        { t: 0.26, ...watching, head: -4 },
        { t: 0.32, ...watching, head: 10 },
        { t: 0.345, ...kneesUp },
        { t: 0.37, ...halfUp(89) },
        { t: 0.395, ...almostUp(86) },
        { t: 0.42, ...flip(stand(84, k)) },
        { t: 0.46, ...flip(walkA(78, k)) },
        { t: 0.5, ...pressing },
        { t: 0.55, ...pressing },
        { t: 0.59, ...walkA(84, k) },
        { t: 0.63, ...walkB(96, k) },
        { t: 0.67, ...stand(106, k), la: [-150, -175], ra: [150, 175] },
        { t: 0.72, ...holdFront(108, k) },
        { t: 0.78, ...holdFront(108, k) },
        { t: 0.81, ...holdFront(108, k), la: [100, 150], ra: [110, 160] },
        { t: 0.86, ...stand(108, k) },
        { t: 0.89, ...flip(walkA(102, k)) },
        { t: 0.92, ...flip(walkB(96, k)) },
        { t: 0.94, ...almostUp(94) },
        { t: 0.96, ...halfUp(93) },
        { t: 0.98, ...kneesUp },
      ],
    },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...flip(stand(162)) },
        { t: 0.05, ...flip(walkA(152)) },
        { t: 0.09, ...flip(walkB(141)) },
        { t: 0.13, ...flip(stand(132)) },
        { t: 0.17, ...pointing },
        { t: 0.34, ...pointing },
        { t: 0.38, ...stand(132) },
        { t: 0.42, ...walkA(142) },
        { t: 0.46, ...walkB(152) },
        { t: 0.5, ...holding },
        { t: 0.72, ...holding },
        { t: 0.75, ...tossing },
        { t: 0.79, ...flip(stand(162)) },
        { t: 0.84, ...holding },
        { t: 0.9, ...holding },
        { t: 0.95, ...flip(stand(162)) },
      ],
    },
    // La pelota de la actividad puente: aparece en las manos del adulto y van y vienen.
    {
      kind: 'circle',
      r: 4,
      fill: 'coral',
      stroke: 'white',
      sw: 1,
      frames: [
        { t: 0, ...ball(138, 76, 0) },
        { t: 0.47, ...ball(138, 76, 0) },
        { t: 0.5, ...ball(138, 76) },
        { t: 0.72, ...ball(138, 76) },
        { t: 0.75, ...ball(131, 56) },
        { t: 0.78, ...ball(127, 90) },
        { t: 0.8, ...ball(127, 90) },
        { t: 0.82, ...ball(132, 60) },
        { t: 0.84, ...ball(138, 76) },
        { t: 0.9, ...ball(138, 76) },
        { t: 0.93, ...ball(138, 76, 0) },
      ],
    },
    // Globito con el aviso.
    {
      kind: 'rect',
      w: 38,
      h: 15,
      r: 6,
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: [
        { t: 0, x: 154, y: 36, o: 0, s: 0.6 },
        { t: 0.15, x: 154, y: 36, o: 0, s: 0.6 },
        { t: 0.19, x: 154, y: 36, o: 1, s: 1 },
        { t: 0.36, x: 154, y: 36, o: 1, s: 1 },
        { t: 0.4, x: 154, y: 36, o: 0, s: 0.6 },
      ],
    },
    {
      kind: 'text',
      text: '5 min',
      size: 10,
      fill: 'ink',
      frames: [
        { t: 0, x: 154, y: 39.5, o: 0 },
        { t: 0.15, x: 154, y: 39.5, o: 0 },
        { t: 0.19, x: 154, y: 39.5, o: 1 },
        { t: 0.36, x: 154, y: 39.5, o: 1 },
        { t: 0.4, x: 154, y: 39.5, o: 0 },
      ],
    },
    {
      kind: 'circle',
      r: 1.8,
      fill: 'coral',
      frames: [
        { t: 0, x: 145, y: 48, o: 0 },
        { t: 0.15, x: 145, y: 48, o: 0 },
        { t: 0.19, x: 145, y: 48, o: 1 },
        { t: 0.36, x: 145, y: 48, o: 1 },
        { t: 0.4, x: 145, y: 48, o: 0 },
      ],
    },
  ],
};

export default scene;
