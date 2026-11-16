import type { Keyframe, Motion, Pose, Scene } from '../engine';
import { stand } from '../poses';

// Teatro de sombras: el adulto alumbra la pared con la linterna y el chico pone las manos en la
// luz; en la pared aparece un perro que ladra y después un pájaro que vuela.
const k = 0.7;
const SHADOW = { x: 166, y: 64 };
const DOG = { from: 0, to: 0.46 };
const BIRD = { from: 0.52, to: 0.94 };

const holder: Pose = { ...stand(36), ra: [96, 92], la: [20, 60] };
const dogHands: Pose = { ...stand(100, k), la: [115, 140], ra: [122, 152], head: 8 };
const dogBark: Pose = { ...dogHands, la: [118, 115] };
const birdHands: Pose = { ...stand(100, k), la: [105, 165], ra: [135, 140], head: 8 };
const birdFlap: Pose = { ...birdHands, la: [105, 140], ra: [135, 165] };

/** Visible solo entre `from` y `to` (con un fundido corto), quieto en `at`. */
function during(
  from: number,
  to: number,
  at: Partial<Motion>,
  inner: Keyframe<Partial<Motion>>[] = [],
): Keyframe<Partial<Motion>>[] {
  return [
    { t: 0, ...at, o: from === 0 ? 1 : 0 },
    ...(from === 0 ? [] : [{ t: from, ...at, o: 0 }]),
    { t: from + 0.03, ...at, o: 1 },
    ...inner,
    { t: to, ...at, o: 1 },
    { t: to + 0.03, ...at, o: 0 },
    ...(from === 0 ? [{ t: 0.97, ...at, o: 0 }] : []),
  ];
}
// Mandíbula del perro: se abre tres veces.
const barks = [0.1, 0.22, 0.34];
const DOG_SIZE = 1;
const JAW = { x: SHADOW.x + 2 * DOG_SIZE, y: SHADOW.y + 2 * DOG_SIZE, s: DOG_SIZE };
const jaw: Keyframe<Partial<Motion>>[] = barks.flatMap((b) => [
  { t: b, ...JAW, rot: 0, o: 1 },
  { t: b + 0.04, ...JAW, rot: 24, o: 1 },
  { t: b + 0.08, ...JAW, rot: 0, o: 1 },
]);
// Alas del pájaro: aletean mientras sube y baja un poco.
const flaps = [0.58, 0.66, 0.74, 0.82, 0.9];
const wing = (side: 1 | -1): Keyframe<Partial<Motion>>[] =>
  flaps.map((f, i) => ({
    t: f,
    x: SHADOW.x,
    y: SHADOW.y + (i % 2 === 0 ? -3 : 2),
    rot: i % 2 === 0 ? -28 * side : 18 * side,
    o: 1,
  }));

const scene: Scene = {
  duration: 8000,
  still: 0.14,
  bg: 'sun',
  elements: [
    // La pared clara y el círculo de luz.
    {
      kind: 'rect',
      w: 42,
      h: 110,
      r: 3,
      fill: 'cream',
      stroke: 'muted',
      sw: 1,
      frames: [{ t: 0, x: 169, y: 71, o: 0.9 }],
    },
    { kind: 'ellipse', rx: 19, ry: 34, fill: 'sun', frames: [{ t: 0, x: 168, y: 64, o: 0.5 }] },
    // Haz de luz desde la linterna.
    {
      kind: 'poly',
      points: '73,63 150,28 150,100 73,69',
      fill: 'sun',
      frames: [{ t: 0, x: 0, y: 0, o: 0.35 }],
    },
    // Sombra del perro: cabeza con oreja y hocico, y la mandíbula de abajo que se abre.
    {
      kind: 'path',
      d: 'M-12 12 C-15 1 -11 -8 -5 -9 L-4 -19 L2 -9 C6 -8 10 -6 17 -3 Q20 -1 17 1 L2 2 L-1 12 Z',
      fill: 'night',
      frames: during(DOG.from, DOG.to, { ...SHADOW, s: DOG_SIZE }),
    },
    {
      kind: 'path',
      d: 'M0 0 L13 0 Q15 3 11 4 L0 6 Z',
      fill: 'night',
      frames: during(DOG.from, DOG.to, JAW, jaw),
    },
    {
      kind: 'circle',
      r: 1.4,
      fill: 'sun',
      frames: during(DOG.from, DOG.to, { x: SHADOW.x + 3.6, y: SHADOW.y - 6 }),
    },
    // Sombra del pájaro: cuerpo y dos alas.
    {
      kind: 'ellipse',
      rx: 4,
      ry: 6,
      fill: 'night',
      frames: during(
        BIRD.from,
        BIRD.to,
        SHADOW,
        flaps.map((f, i) => ({ t: f, x: SHADOW.x, y: SHADOW.y + (i % 2 === 0 ? -3 : 2), o: 1 })),
      ),
    },
    {
      kind: 'path',
      d: 'M0 0 Q8 -12 20 -8 Q10 -4 0 4 Z',
      fill: 'night',
      frames: during(BIRD.from, BIRD.to, SHADOW, wing(1)),
    },
    {
      kind: 'path',
      d: 'M0 0 Q-8 -12 -20 -8 Q-10 -4 0 4 Z',
      fill: 'night',
      frames: during(BIRD.from, BIRD.to, SHADOW, wing(-1)),
    },
    // Lo que dicen los personajes.
    {
      kind: 'text',
      text: '¡Guau!',
      size: 10,
      fill: 'coral',
      frames: during(0.08, 0.4, { x: 169, y: 30 }),
    },
    {
      kind: 'text',
      text: '¡Pío!',
      size: 10,
      fill: 'coral',
      frames: during(0.6, 0.9, { x: 169, y: 112 }),
    },
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...holder },
        { t: 0.5, ...holder, head: 6 },
      ],
    },
    // Linterna en la mano del adulto.
    { kind: 'rect', w: 12, h: 5, r: 1.5, fill: 'muted', frames: [{ t: 0, x: 67, y: 66, rot: -6 }] },
    {
      kind: 'rect',
      w: 2.5,
      h: 6.5,
      r: 1,
      fill: 'sun',
      frames: [{ t: 0, x: 73.5, y: 65.4, rot: -6 }],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...dogHands },
        ...barks.flatMap((b) => [
          { t: b, ...dogHands },
          { t: b + 0.04, ...dogBark },
          { t: b + 0.08, ...dogHands },
        ]),
        { t: 0.47, ...dogHands },
        { t: 0.53, ...birdHands },
        ...flaps.map((f, i) => ({ t: f, ...(i % 2 === 0 ? birdFlap : birdHands) })),
        { t: 0.96, ...dogHands },
      ],
    },
  ],
};

export default scene;
