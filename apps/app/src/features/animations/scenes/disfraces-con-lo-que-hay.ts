import { skeleton, type Keyframe, type Motion, type Pose, type Scene } from '../engine';
import { crouch, jump, sitFloor, stand, walkA, walkB } from '../poses';

// Disfraces con lo que hay: el chico saca de la caja un pañuelo (capa) y una corona de cartón, se
// disfraza y actúa su personaje; el adulto, sentado en el piso, aplaude.
const k = 0.7;
const S = stand(140, k);
const low = crouch(148, k).y - 2.8; // agachado, con los pies en el piso
const grabCape: Pose = { ...crouch(148, k), y: low, torso: 25, ra: [24, -5] };
const grabCrown: Pose = { ...crouch(148, k), y: low, ra: [44, 11] };
/** Caminando hacia la izquierda (walkA/walkB espejados). */
const mirror = (p: Pose): Pose => ({
  ...p,
  torso: -p.torso,
  la: [-p.la[0], -p.la[1]],
  ra: [-p.ra[0], -p.ra[1]],
  ll: [-p.ll[0], -p.ll[1]],
  rl: [-p.rl[0], -p.rl[1]],
});
// Pose de superhéroe: puño arriba y la otra mano en la cintura.
const hero: Pose = { ...stand(96, k), la: [-135, -165], ra: [60, -40] };

const kid: Keyframe<Pose>[] = [
  { t: 0, ...grabCape },
  { t: 0.08, ...S, ra: [80, 165] },
  { t: 0.16, ...S, la: [-42, 157], ra: [42, 203] },
  { t: 0.24, ...grabCrown },
  { t: 0.32, ...S, la: [-169, -173], ra: [169, 173] },
  { t: 0.38, ...S, la: [-116, -212], ra: [116, 212] },
  { t: 0.44, ...mirror(walkA(122, k)) },
  { t: 0.5, ...mirror(walkB(102, k)) },
  { t: 0.56, ...hero },
  { t: 0.64, ...jump(96, k) },
  { t: 0.7, ...hero },
  { t: 0.78, ...stand(96, k), torso: -40, la: [-10, -5], ra: [10, 5] },
  { t: 0.86, ...stand(96, k) },
  { t: 0.9, ...walkB(114, k) },
  { t: 0.95, ...walkA(134, k) }, // termina con la pierna derecha adelante, como al agacharse
];

// La capa y la corona siguen al cuello y a la cabeza del chico mientras las tiene puestas.
const worn = (from: number, place: (s: ReturnType<typeof skeleton>, p: Pose) => Partial<Motion>) =>
  kid
    .filter((f) => f.t >= from && f.t <= 0.86)
    .map((f) => ({ t: f.t, ...place(skeleton(f, k), f), o: 1 }));
const atNeck = (s: ReturnType<typeof skeleton>, p: Pose) => ({
  x: s.neck[0],
  y: s.neck[1],
  rot: p.torso,
});
const onHead = (s: ReturnType<typeof skeleton>) => ({
  x: s.head[0],
  y: s.head[1] - s.headR - 0.3,
  rot: 0,
});
const lastNeck = skeleton(kid[13]!, k).neck;
const lastHead = skeleton(kid[13]!, k);

const draped = { x: 160, y: 112, rot: -40 };
const inBox = { x: 164, y: 115, rot: 0 };

const scene: Scene = {
  duration: 9000,
  still: 0.58,
  bg: 'sun',
  elements: [
    // Corona de cartón.
    {
      kind: 'path',
      d: 'M-5 0 L-5 -6 L-2.5 -3 L0 -7 L2.5 -3 L5 -6 L5 0 Z',
      fill: 'sun',
      stroke: 'wood',
      sw: 1.2,
      frames: [
        { t: 0, ...inBox, o: 1 },
        { t: 0.16, ...inBox },
        { t: 0.24, x: 163, y: 109, rot: 0 },
        { t: 0.32, x: 140, y: 69, rot: 0 },
        ...worn(0.38, onHead),
        { t: 0.9, ...onHead(lastHead), o: 0 },
        { t: 0.96, ...inBox, o: 0 },
      ],
    },
    // La caja de cartón con ropa vieja (la corona espera adentro; el pañuelo cuelga adelante).
    { kind: 'rect', w: 26, h: 18, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 168, y: 121 }] },
    {
      kind: 'path',
      d: 'M-13 -9 L-18 -15 M13 -9 L18 -15',
      fill: 'none',
      stroke: 'wood',
      sw: 2.5,
      frames: [{ t: 0, x: 168, y: 121 }],
    },
    // Capa (pañuelo): colgada de la caja, en la mano y después puesta.
    {
      kind: 'poly',
      points: '-1.5,0 1.5,0 7,20 -2.5,20',
      fill: 'coral',
      frames: [
        { t: 0, ...draped, o: 1 },
        { t: 0.08, x: 152, y: 80, rot: 0 },
        ...worn(0.16, atNeck),
        { t: 0.9, x: lastNeck[0], y: lastNeck[1], rot: 0, o: 0 },
        { t: 0.96, ...draped, o: 0 },
      ],
    },
    { kind: 'figure', color: 'violet', scale: k, frames: kid },
    // El adulto mira sentado y aplaude.
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...sitFloor(34) },
        { t: 0.3, ...sitFloor(34), head: 8 },
        { t: 0.5, ...sitFloor(34) },
        { t: 0.56, ...sitFloor(34), la: [71, 137], ra: [78, 134] },
        { t: 0.6, ...sitFloor(34), la: [36, 143], ra: [115, 118] },
        { t: 0.64, ...sitFloor(34), la: [71, 137], ra: [78, 134] },
        { t: 0.68, ...sitFloor(34), la: [36, 143], ra: [115, 118] },
        { t: 0.72, ...sitFloor(34), la: [71, 137], ra: [78, 134] },
        { t: 0.76, ...sitFloor(34), la: [36, 143], ra: [115, 118] },
        { t: 0.8, ...sitFloor(34), la: [71, 137], ra: [78, 134] },
        { t: 0.86, ...sitFloor(34) },
      ],
    },
    // El nombre del personaje.
    {
      kind: 'text',
      text: '¡Súper Rey!',
      size: 10,
      fill: 'violet',
      frames: [
        { t: 0, x: 96, y: 44, o: 0 },
        { t: 0.53, x: 96, y: 44, o: 0 },
        { t: 0.56, x: 96, y: 42, o: 1 },
        { t: 0.84, x: 96, y: 42, o: 1 },
        { t: 0.87, x: 96, y: 42, o: 0 },
      ],
    },
  ],
};

export default scene;
