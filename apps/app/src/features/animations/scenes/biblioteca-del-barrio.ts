import type { Hue, Keyframe, Motion, Pose, Scene, ShapeElement } from '../engine';
import { holdFront, stand, walkA, walkB } from '../poses';

// Biblioteca del barrio: el adulto y el chico llegan a la biblioteca, cada uno elige un libro del
// estante (el chico lo levanta contento) y se lo llevan para la semana.
const k = 0.7;

// Estante: parantes y tablas.
const PLANKS = [40, 64, 88, 112];
const COLORS: Hue[] = ['coral', 'sky', 'leaf', 'sun', 'violet', 'mint'];
// Libros que se eligen (centro en el estante).
const KID_BOOK = { x: 122, y: 79 };
const ADULT_BOOK = { x: 150, y: 54.5 };

const shelfBooks: ShapeElement[] = PLANKS.slice(1).flatMap((plank, row) =>
  [122, 129, 136, 143, 150, 157, 164, 171, 178]
    .filter((x) => !(row === 1 && x === KID_BOOK.x) && !(row === 0 && x === ADULT_BOOK.x))
    .map((x, i): ShapeElement => {
      const h = 13 + ((i * 5 + row * 3) % 6);
      return {
        kind: 'rect',
        w: 5.5,
        h,
        r: 1,
        fill: COLORS[(i + row * 2) % COLORS.length]!,
        frames: [{ t: 0, x, y: plank - 1.5 - h / 2, o: 0.9 }],
      };
    }),
);

// Poses: buscar el libro, mirarlo y llevarlo con la mano al costado.
const CARRY = { ra: [15, 15] as [number, number] };
const kidReach: Pose = { ...stand(106, k), ra: [93, 137] };
const adultReach: Pose = { ...stand(132), ra: [99, 161] };
const kidHappy: Pose = { ...stand(106, k), la: [140, 160], ra: [150, 170] };

/** Pasos de ida (cada cuadro es medio paso). */
const steps = (
  from: number,
  to: number,
  scale: number,
  t0: number,
  dt: number,
): Keyframe<Pose>[] => {
  const n = 4;
  return Array.from({ length: n }, (_, i) => {
    const x = from + ((to - from) * (i + 1)) / (n + 1);
    return { t: t0 + dt * i, ...(i % 2 === 0 ? walkA(x, scale) : walkB(x, scale)) };
  });
};
/** Pasos de vuelta, con el libro en la mano. */
const stepsBack = (
  from: number,
  to: number,
  scale: number,
  t0: number,
  dt: number,
): Keyframe<Pose>[] => steps(from, to, scale, t0, dt).map((f) => ({ ...f, ...CARRY }));

/** El libro: en el estante, en la mano, levantado, y de vuelta en la mano para irse. */
const bookFrames = (
  shelf: { x: number; y: number },
  reach: [number, number],
  hold: [number, number],
  carry: (x: number) => [number, number],
  xs: number[],
  lift?: [number, number],
): Keyframe<Partial<Motion>>[] => [
  { t: 0, ...shelf, o: 1, rot: 0 },
  { t: 0.3, ...shelf, o: 1, rot: 0 },
  { t: 0.34, x: reach[0], y: reach[1], rot: 0 },
  { t: 0.39, x: hold[0], y: hold[1], rot: -10 },
  ...(lift
    ? [
        { t: 0.46, x: lift[0], y: lift[1], rot: 0 },
        { t: 0.52, x: hold[0], y: hold[1], rot: -10 },
      ]
    : []),
  { t: 0.6, x: hold[0], y: hold[1], rot: -10 },
  { t: 0.64, x: carry(xs[0]!)[0], y: carry(xs[0]!)[1], rot: 0 },
  ...xs
    .slice(1, -1)
    .map((x, i) => ({ t: 0.68 + i * 0.06, x: carry(x)[0], y: carry(x)[1], rot: 0 })),
  { t: 0.92, x: carry(xs[xs.length - 1]!)[0], y: carry(xs[xs.length - 1]!)[1], rot: 0, o: 1 },
  { t: 0.94, x: carry(xs[xs.length - 1]!)[0], y: carry(xs[xs.length - 1]!)[1], rot: 0, o: 0 },
  { t: 0.95, ...shelf, o: 0, rot: 0 },
];

const KID_BACK = [106, 90, 74, 58, 42, 24];
const ADULT_BACK = [132, 116, 100, 84, 68, 50];

const scene: Scene = {
  duration: 8000,
  still: 0.47,
  bg: 'coral',
  elements: [
    { kind: 'text', text: 'Biblioteca', size: 11, fill: 'ink', frames: [{ t: 0, x: 152, y: 32 }] },
    { kind: 'line', x2: 0, y2: 90, stroke: 'wood', sw: 3, frames: [{ t: 0, x: 118, y: 40 }] },
    { kind: 'line', x2: 0, y2: 90, stroke: 'wood', sw: 3, frames: [{ t: 0, x: 184, y: 40 }] },
    ...PLANKS.map((y): ShapeElement => ({
      kind: 'line',
      x2: 66,
      y2: 0,
      stroke: 'wood',
      sw: 3,
      frames: [{ t: 0, x: 118, y }],
    })),
    ...shelfBooks,
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...stand(50) },
        ...steps(50, 132, 1, 0.05, 0.05),
        { t: 0.25, ...stand(132) },
        { t: 0.3, ...adultReach },
        { t: 0.39, ...holdFront(132) },
        { t: 0.5, ...holdFront(132), head: 6 },
        { t: 0.6, ...holdFront(132) },
        { t: 0.64, ...stand(132), ...CARRY },
        ...stepsBack(132, 50, 1, 0.68, 0.06),
        { t: 0.92, ...stand(50), ...CARRY },
        { t: 0.96, ...stand(50) },
      ],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...stand(24, k) },
        ...steps(24, 106, k, 0.05, 0.05),
        { t: 0.25, ...stand(106, k) },
        { t: 0.3, ...kidReach },
        { t: 0.39, ...holdFront(106, k) },
        { t: 0.46, ...kidHappy },
        { t: 0.52, ...holdFront(106, k) },
        { t: 0.6, ...holdFront(106, k) },
        { t: 0.64, ...stand(106, k), ...CARRY },
        ...stepsBack(106, 24, k, 0.68, 0.06),
        { t: 0.92, ...stand(24, k), ...CARRY },
        { t: 0.96, ...stand(24, k) },
      ],
    },
    // Los dos libros elegidos.
    {
      kind: 'rect',
      w: 5.5,
      h: 16,
      r: 1,
      fill: 'sun',
      stroke: 'ink',
      sw: 1.2,
      frames: bookFrames(ADULT_BOOK, [150, 54], [155, 74], (x) => [x + 8, 97], ADULT_BACK),
    },
    {
      kind: 'rect',
      w: 5.5,
      h: 15,
      r: 1,
      fill: 'violet',
      stroke: 'ink',
      sw: 1.2,
      frames: bookFrames(
        KID_BOOK,
        [122, 80],
        [122.5, 90],
        (x) => [x + 5.5, 107],
        KID_BACK,
        [114, 66],
      ),
    },
  ],
};

export default scene;
