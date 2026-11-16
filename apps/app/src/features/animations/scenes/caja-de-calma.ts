import type { Keyframe, Motion, Pose, Scene } from '../engine';
import { sitFloor } from '../poses';

// Caja de calma: el adulto le acerca la caja al chico, que saca la pelota blanda y la aprieta
// mientras se calma; el adulto lo acompaña sentado, en silencio.
const k = 0.7;

// Dónde está la caja (centro) en cada momento: cerca del adulto o acercada al chico.
const NEAR = 96;
const OFFERED = 104;
const box = (t: number, bx: number): Keyframe<Partial<Motion>> => ({ t, x: bx, y: 121.5 });
const boxPath = (dx: number, dy: number, rot = 0): Keyframe<Partial<Motion>>[] => [
  { t: 0, x: NEAR + dx, y: dy, rot },
  { t: 0.06, x: NEAR + dx, y: dy, rot },
  { t: 0.14, x: OFFERED + dx, y: dy, rot },
  { t: 0.88, x: OFFERED + dx, y: dy, rot },
  { t: 0.95, x: NEAR + dx, y: dy, rot },
];

// Adulto sentado en el piso, mirando a la derecha.
const sit: Pose = sitFloor(50);
const reachNear: Pose = { ...sitFloor(50), torso: 30, la: [64, 25], ra: [72, 26] };
const reachOffered: Pose = { ...sitFloor(50), torso: 40, la: [67, 43], ra: [79, 44] };
const calm: Pose = { ...sitFloor(50), torso: 6 };

// Chico sentado en el piso mirando a la izquierda (las piernas hacia la caja).
const kidSit: Pose = {
  ...sitFloor(140, k),
  torso: 4,
  la: [-20, -60],
  ra: [-35, -75],
  ll: [-80, -95],
  rl: [-85, -92],
};
const kidReach: Pose = { ...kidSit, torso: -30, la: [-79, -103], ra: [-53, -123] };
const kidHug: Pose = { ...kidSit, torso: 0, la: [-7, -131], ra: [16, -107] };

const BALL_IN_BOX = { x: OFFERED + 8, y: 108 };
const BALL_HUG = { x: 133, y: 110 };

const scene: Scene = {
  duration: 8000,
  still: 0.45,
  bg: 'sky',
  elements: [
    // Aura de calma que respira detrás del chico.
    {
      kind: 'circle',
      r: 20,
      fill: 'sky',
      frames: [
        { t: 0, x: 138, y: 108, s: 0.6, o: 0 },
        { t: 0.3, x: 138, y: 108, s: 0.6, o: 0 },
        { t: 0.38, x: 138, y: 108, s: 0.9, o: 0.3 },
        { t: 0.48, x: 138, y: 108, s: 1.1, o: 0.3 },
        { t: 0.58, x: 138, y: 108, s: 0.9, o: 0.3 },
        { t: 0.68, x: 138, y: 108, s: 1.1, o: 0.3 },
        { t: 0.78, x: 138, y: 108, s: 0.8, o: 0 },
      ],
    },
    // Lo que hay en la caja: un cuento, una foto y la pelota blanda.
    { kind: 'rect', w: 6, h: 12, r: 1, fill: 'violet', frames: boxPath(-7, 108) },
    {
      kind: 'rect',
      w: 7,
      h: 9,
      r: 1,
      fill: 'cream',
      stroke: 'wood',
      sw: 1.2,
      frames: boxPath(0, 107, 10),
    },
    {
      kind: 'circle',
      r: 4.4,
      fill: 'mint',
      frames: [
        { t: 0, x: NEAR + 8, y: 108, s: 1 },
        { t: 0.06, x: NEAR + 8, y: 108, s: 1 },
        { t: 0.14, ...BALL_IN_BOX, s: 1 },
        { t: 0.25, ...BALL_IN_BOX, s: 1 },
        { t: 0.31, ...BALL_HUG, s: 1 },
        // La aprieta y la suelta.
        { t: 0.37, ...BALL_HUG, s: 0.75 },
        { t: 0.43, ...BALL_HUG, s: 1 },
        { t: 0.49, ...BALL_HUG, s: 0.75 },
        { t: 0.55, ...BALL_HUG, s: 1 },
        { t: 0.61, ...BALL_HUG, s: 0.75 },
        { t: 0.67, ...BALL_HUG, s: 1 },
        { t: 0.72, ...BALL_HUG, s: 1 },
        { t: 0.8, ...BALL_IN_BOX, s: 1 },
        { t: 0.88, ...BALL_IN_BOX, s: 1 },
        { t: 0.95, x: NEAR + 8, y: 108, s: 1 },
      ],
    },
    // La caja decorada.
    {
      kind: 'rect',
      w: 26,
      h: 17,
      r: 2,
      fill: 'sun',
      frames: [
        box(0, NEAR),
        box(0.06, NEAR),
        box(0.14, OFFERED),
        box(0.88, OFFERED),
        box(0.95, NEAR),
      ],
    },
    {
      kind: 'path',
      d: 'M0 2 C -4 -2, -6 3, 0 6 C 6 3, 4 -2, 0 2 Z',
      fill: 'coral',
      frames: boxPath(0, 118),
    },
    { kind: 'circle', r: 1.3, fill: 'cream', frames: boxPath(-8, 125) },
    { kind: 'circle', r: 1.3, fill: 'cream', frames: boxPath(8, 125) },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...sit },
        { t: 0.06, ...reachNear },
        { t: 0.14, ...reachOffered },
        { t: 0.22, ...calm },
        { t: 0.5, ...calm, torso: 8 },
        { t: 0.8, ...calm },
        { t: 0.88, ...reachOffered },
        { t: 0.95, ...reachNear },
      ],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...kidSit, head: -15 },
        { t: 0.16, ...kidSit, head: -15 },
        { t: 0.25, ...kidReach },
        { t: 0.31, ...kidHug, head: -8 },
        { t: 0.43, ...kidHug, torso: 5 },
        { t: 0.55, ...kidHug, torso: 0 },
        { t: 0.67, ...kidHug, torso: 5 },
        { t: 0.72, ...kidHug },
        { t: 0.8, ...kidReach },
        { t: 0.86, ...kidSit },
      ],
    },
  ],
};

export default scene;
