import {
  BODY,
  skeleton,
  type Keyframe,
  type Limb,
  type Motion,
  type Pose,
  type Scene,
  type ShapeElement,
} from '../engine';
import { walkA, walkB } from '../poses';

// Caminata o bici con charla: el adulto camina y el adolescente pedalea a su lado; el paisaje
// pasa (árboles) y se van turnando para hablar.
const teen = 0.9;
const STEPS = 8; // medios pasos del adulto por vuelta
const SAMPLES = 64; // cuadros calculados para el pedaleo y el paisaje
const STRIDE = 16.7; // lo que avanza un medio paso (el paisaje corre a esa velocidad)
const SCROLL = STEPS * STRIDE;

const deg = (rad: number) => (rad * 180) / Math.PI;
const times = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);

/** Ángulos de un brazo o una pierna para que la punta llegue a `target` (codo o rodilla hacia `bend`). */
function ik(
  root: [number, number],
  target: [number, number],
  l1: number,
  l2: number,
  bend: 1 | -1,
): Limb {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const base = Math.atan2(dx, dy);
  const open = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const upper = base + bend * open;
  const joint: [number, number] = [root[0] + Math.sin(upper) * l1, root[1] + Math.cos(upper) * l1];
  return [deg(upper), deg(Math.atan2(target[0] - joint[0], target[1] - joint[1]))];
}

// ── Bici (mirando a la derecha) ──
const REAR: [number, number] = [108, 121];
const FRONT: [number, number] = [146, 121];
const CRANK: [number, number] = [125, 121];
const SEAT: [number, number] = [118, 103];
const HEAD: [number, number] = [139, 102];
const GRIP: [number, number] = [137, 95];
const CRANK_R = 5;
const PEDAL_TURNS = 3;
const WHEEL_TURNS = 2.25; // múltiplo de 1/4: los rayos en cruz cierran el bucle sin saltar

// Pedaleo hacia adelante: abajo → atrás → arriba → adelante (sentido horario en pantalla).
const pedal = (t: number, phase: number): [number, number] => {
  const a = -2 * Math.PI * (PEDAL_TURNS * t + phase);
  return [CRANK[0] + Math.sin(a) * CRANK_R, CRANK[1] + Math.cos(a) * CRANK_R];
};

function rider(t: number): Pose {
  const hip: [number, number] = [SEAT[0], SEAT[1] - 2];
  const base: Pose = {
    x: hip[0],
    y: hip[1],
    torso: 24,
    head: -12,
    la: [0, 0],
    ra: [0, 0],
    ll: [0, 0],
    rl: [0, 0],
  };
  const neck = skeleton(base, teen).neck;
  const arm = ik(neck, GRIP, BODY.upperArm * teen, BODY.forearm * teen, -1);
  const leg = (phase: number) => ik(hip, pedal(t, phase), BODY.thigh * teen, BODY.shin * teen, 1);
  return { ...base, la: arm, ra: [arm[0] - 6, arm[1] - 4], ll: leg(0), rl: leg(0.5) };
}

const riderAt0 = rider(0);
const HELMET = {
  x: skeleton(riderAt0, teen).head[0],
  y: skeleton(riderAt0, teen).head[1],
  rot: riderAt0.torso + (riderAt0.head ?? 0),
};

const wheel = (at: [number, number]): ShapeElement[] => [
  {
    kind: 'circle',
    r: 9,
    fill: 'none',
    stroke: 'ink',
    sw: 2.2,
    frames: [{ t: 0, x: at[0], y: at[1] }],
  },
  {
    kind: 'path',
    d: 'M-8 0 H8 M0 -8 V8',
    fill: 'none',
    stroke: 'muted',
    sw: 1,
    frames: times.map((t) => ({ t, x: at[0], y: at[1], rot: 360 * WHEEL_TURNS * t })),
  },
];

// ── Paisaje que corre hacia la izquierda ──
const CANOPY = 13;
// Un árbol aparece y desaparece del todo antes de que la copa toque el borde (así nunca se ve cortado).
const fade = (x: number) =>
  Math.max(0, Math.min(1, (x - CANOPY - 2) / 18, (200 - CANOPY - 2 - x) / 18));
/** Un objeto del fondo que corre a la izquierda; tres copias separadas por `SCROLL` hacen el bucle. */
function scenery(shape: Omit<ShapeElement, 'frames'>, start: number, dy: number): ShapeElement[] {
  return [-1, 0, 1].map((copy) => ({
    ...shape,
    frames: times.map((t) => {
      const x = start - SCROLL * (t + copy);
      return { t, x, y: dy, o: fade(x) };
    }),
  }));
}
const tree = (start: number): ShapeElement[] => [
  ...scenery({ kind: 'rect', w: 4, h: 26, r: 1.5, fill: 'wood' }, start, 117),
  ...scenery({ kind: 'circle', r: CANOPY, fill: 'leaf' }, start, 96),
];

// Globito de diálogo con tres puntos.
function bubble(x: number, y: number, from: number, to: number): ShapeElement[] {
  const show = (dx: number, dy: number): Keyframe<Partial<Motion>>[] => [
    { t: 0, x: x + dx, y: y + dy, o: 0, s: 0.6 },
    { t: from, x: x + dx, y: y + dy, o: 0, s: 0.6 },
    { t: from + 0.04, x: x + dx, y: y + dy, o: 1, s: 1 },
    { t: to, x: x + dx, y: y + dy, o: 1, s: 1 },
    { t: to + 0.04, x: x + dx, y: y + dy, o: 0, s: 0.6 },
  ];
  return [
    {
      kind: 'rect',
      w: 22,
      h: 15,
      r: 6,
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: show(0, 0),
    },
    { kind: 'circle', r: 1.8, fill: 'coral', frames: show(-6, 11) },
    { kind: 'circle', r: 1.2, fill: 'coral', frames: show(-9, 15) },
    { kind: 'text', text: '...', size: 11, fill: 'ink', frames: show(0, 3) },
  ];
}

const scene: Scene = {
  duration: STEPS * 800,
  still: 0.25,
  bg: 'mint',
  elements: [
    { kind: 'circle', r: 9, fill: 'sun', frames: [{ t: 0, x: 172, y: 28, o: 0.8 }] },
    ...tree(130),
    // Bici: ruedas, cuadro, manubrio, asiento y pedalera.
    ...wheel(REAR),
    ...wheel(FRONT),
    {
      kind: 'path',
      d: `M${REAR} L${CRANK} L${SEAT} Z M${CRANK} L${HEAD} L${SEAT} M${HEAD} L${FRONT} M${HEAD} L${GRIP} l-3 0`,
      fill: 'none',
      stroke: 'sky',
      sw: 2.4,
      frames: [{ t: 0, x: 0, y: 0 }],
    },
    {
      kind: 'line',
      x2: 8,
      y2: 0,
      stroke: 'ink',
      sw: 2.6,
      frames: [{ t: 0, x: SEAT[0] - 5, y: SEAT[1] - 1 }],
    },
    {
      kind: 'line',
      x2: 0,
      y2: CRANK_R,
      stroke: 'ink',
      sw: 1.6,
      frames: times.map((t) => ({ t, x: CRANK[0], y: CRANK[1], rot: 360 * PEDAL_TURNS * t })),
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: teen,
      frames: times.map((t) => ({ t, ...rider(t) })),
    },
    // Casco (la cabeza del ciclista no se mueve: solo pedalea).
    {
      kind: 'path',
      d: 'M-9.2 1 A9.2 9.2 0 0 1 9.2 1 L11.5 2 Z',
      fill: 'coral',
      frames: [{ t: 0, x: HELMET.x, y: HELMET.y, rot: HELMET.rot }],
    },
    {
      kind: 'figure',
      color: 'coral',
      frames: Array.from({ length: STEPS }, (_, i) => ({
        t: i / STEPS,
        ...(i % 2 === 0 ? walkA(62) : walkB(62)),
      })),
    },
    ...bubble(78, 36, 0.06, 0.36),
    ...bubble(150, 44, 0.5, 0.82),
  ],
};

export default scene;
