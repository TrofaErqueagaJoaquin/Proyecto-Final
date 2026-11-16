import type { Keyframe, Motion, Pose, Scene, ShapeElement } from '../engine';
import { sitFloor } from '../poses';

// Leer con preguntas: sentados en el piso frente a frente, el adulto sostiene el libro y pregunta;
// el chico señala la ilustración y cuenta lo que pasa. Después dan vuelta la página.
const k = 0.7;
const BOOK = { x: 114, y: 100 };
// Adulto sentado mirando a la derecha, con el libro en las manos.
const reader: Pose = {
  ...sitFloor(78),
  head: 15,
  la: [60, 110],
  ra: [75, 120],
  ll: [115, 57],
  rl: [92, 88],
};
// Chico sentado mirando a la izquierda (al revés que `sitFloor`).
const listener: Pose = {
  x: 145,
  y: 127.3,
  torso: -10,
  head: -5,
  la: [-40, -80],
  ra: [-40, -75],
  ll: [-80, -95],
  rl: [-85, -92],
};
const pointing: Pose = { ...listener, torso: -12, head: -10, ra: [-100, -120] };

// El libro se mueve apenas con las manos del adulto.
const bob = (dx: number, dy: number, extra: Partial<Motion> = {}): Keyframe<Partial<Motion>>[] => [
  { t: 0, x: BOOK.x + dx, y: BOOK.y + dy, ...extra },
  { t: 0.5, x: BOOK.x + dx, y: BOOK.y + dy + 1, ...extra },
];
const page = (side: 1 | -1): ShapeElement => ({
  kind: 'path',
  d: `M0 -9 Q${7 * side} -11 ${15 * side} -9 L${15 * side} 9 Q${7 * side} 7 0 9 Z`,
  fill: 'cream',
  stroke: 'coral',
  sw: 1.6,
  frames: bob(0, 0),
});
const textLine = (dx: number, dy: number, w: number): ShapeElement => ({
  kind: 'line',
  x2: w,
  y2: 0,
  stroke: 'muted',
  sw: 1,
  frames: bob(dx, dy, { o: 0.6 }),
});

// Globito de diálogo (con dos puntitos de cola) que aparece entre `from` y `to`.
const bubble = (x: number, y: number, text: string, from: number, to: number): ShapeElement[] => {
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
      w: 20,
      h: 15,
      r: 6,
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: show(0, 0),
    },
    { kind: 'circle', r: 1.8, fill: 'coral', frames: show(-6, 11) },
    { kind: 'circle', r: 1.2, fill: 'coral', frames: show(-9, 15) },
    { kind: 'text', text, size: 11, fill: 'ink', frames: show(0, 4) },
  ];
};
const scene: Scene = {
  duration: 7000,
  still: 0.32,
  bg: 'coral',
  elements: [
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...reader },
        { t: 0.12, ...reader, head: 22 },
        { t: 0.2, ...reader, head: 4 },
        { t: 0.4, ...reader, head: 4 },
        { t: 0.5, ...reader, head: 18 },
        { t: 0.6, ...reader, head: 10 },
        { t: 0.7, ...reader, head: 18 },
        { t: 0.82, ...reader, ra: [70, 150] },
        { t: 0.9, ...reader },
      ],
    },
    // Libro abierto, con texto a la izquierda y una ilustración (un sol y una loma) a la derecha.
    page(-1),
    page(1),
    textLine(-12, -4, 9),
    textLine(-12, -0.5, 10),
    textLine(-12, 3, 8),
    { kind: 'circle', r: 2.4, fill: 'sun', frames: bob(10, -4) },
    {
      kind: 'path',
      d: 'M-6 3.5 Q0 -3.5 6 3.5 Z',
      fill: 'leaf',
      frames: bob(7, 3.5),
    },
    // La hoja que se da vuelta (gira sobre el lomo).
    {
      kind: 'path',
      d: 'M0 -9 Q7 -11 15 -9 L15 9 Q7 7 0 9 Z',
      fill: 'cream',
      stroke: 'coral',
      sw: 1.6,
      frames: [
        { t: 0, ...BOOK, o: 0, rot: 0 },
        { t: 0.8, ...BOOK, o: 0, rot: 0 },
        { t: 0.81, ...BOOK, o: 1, rot: 0 },
        { t: 0.88, ...BOOK, o: 1, rot: -180 },
        { t: 0.89, ...BOOK, o: 0, rot: -180 },
      ],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...listener },
        { t: 0.2, ...listener, head: 5 },
        { t: 0.27, ...pointing },
        { t: 0.5, ...pointing, head: -2 },
        { t: 0.57, ...pointing, head: -12 },
        { t: 0.64, ...pointing, head: -2 },
        { t: 0.72, ...listener, head: 5 },
      ],
    },
    ...bubble(90, 62, '?', 0.1, 0.4),
    ...bubble(149, 78, '...', 0.44, 0.74),
  ],
};

export default scene;
