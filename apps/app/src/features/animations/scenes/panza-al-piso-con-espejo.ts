import type { Pose, Scene, ShapeElement } from '../engine';
import { lieBelly } from '../poses';

// Panza al piso: en el living, el bebé boca abajo sobre la manta levanta la cabeza para mirarse en
// el espejo, y el adulto, acostado a su altura del otro lado, le canta.
const baby = 0.55;
// Bebé: apoyado en los antebrazos, con la cabeza baja o levantada hacia el espejo.
const babyDown: Pose = {
  ...lieBelly(55, baby),
  y: 126,
  torso: 84,
  head: -15,
  la: [40, 95],
  ra: [30, 92],
};
const babyUp: Pose = {
  ...lieBelly(55, baby),
  y: 126,
  torso: 70,
  head: -40,
  la: [8, 92],
  ra: [0, 90],
};
// Adulto: boca abajo mirando a la izquierda, sobre los codos, con los pies para arriba.
const adult: Pose = {
  x: 165,
  y: 125,
  torso: -72,
  head: 17,
  la: [-10, -90],
  ra: [-5, -88],
  ll: [88, 160],
  rl: [92, 200],
};

// Las notas salen de la boca del adulto y suben en zigzag por encima del espejo.
const note = (delay: number, dx: number): ShapeElement => ({
  kind: 'path',
  d: 'M-2.6 0 a2.6 2 0 1 0 5.2 0 a2.6 2 0 1 0 -5.2 0 M2.6 0 V-9 L6.5 -6.5',
  fill: 'coral',
  stroke: 'coral',
  sw: 1.4,
  frames: [
    { t: 0, x: 116, y: 104, o: 0, s: 0.7 },
    { t: delay, x: 116, y: 104, o: 0, s: 0.7 },
    { t: delay + 0.06, x: 111 + dx, y: 94, o: 1, s: 1.1 },
    { t: delay + 0.16, x: 104 + dx, y: 78, o: 1, s: 1.2 },
    { t: delay + 0.26, x: 98 + dx, y: 62, o: 0, s: 1.2 },
    { t: 0.99, x: 98 + dx, y: 62, o: 0, s: 1.2 },
  ],
});

// Fondo del living: ventana, cuadro y el zócalo, donde la pared se junta con el piso.
const WINDOW = { x: 46, y: 52 };
const room: ShapeElement[] = [
  { kind: 'rect', w: 180, h: 5, r: 1, fill: 'wood', frames: [{ t: 0, x: 100, y: 97, o: 0.3 }] },
  {
    kind: 'rect',
    w: 50,
    h: 42,
    r: 3,
    fill: 'sky',
    frames: [{ t: 0, ...WINDOW, o: 0.35 }],
  },
  // Una nube que se mueve despacio en la ventana.
  {
    kind: 'path',
    d: 'M-8 3 Q-9 -3 -3 -3 Q-1 -8 4 -5 Q9 -5 8 0 Q10 3 6 3 Z',
    fill: 'white',
    frames: [
      { t: 0, x: WINDOW.x - 9, y: WINDOW.y - 7 },
      { t: 0.5, x: WINDOW.x + 9, y: WINDOW.y - 8 },
    ],
  },
  {
    kind: 'path',
    d: 'M-25 -21 H25 V21 H-25 Z M0 -21 V21 M-25 0 H25',
    fill: 'none',
    stroke: 'wood',
    sw: 2.4,
    frames: [{ t: 0, ...WINDOW }],
  },
  // Cuadro con un corazón.
  {
    kind: 'rect',
    w: 26,
    h: 22,
    r: 2,
    fill: 'cream',
    stroke: 'wood',
    sw: 2.2,
    frames: [{ t: 0, x: 156, y: 48 }],
  },
  {
    kind: 'path',
    d: 'M0 4.5 C -8 -1, -4 -7, 0 -3 C 4 -7, 8 -1, 0 4.5 Z',
    fill: 'coral',
    frames: [{ t: 0, x: 156, y: 49 }],
  },
];

const scene: Scene = {
  duration: 6000,
  still: 0.22,
  bg: 'mint',
  elements: [
    ...room,
    // Manta en el piso, vista un poco desde arriba.
    {
      kind: 'poly',
      points: '-84,0 84,0 76,-11 -76,-11',
      fill: 'sun',
      frames: [{ t: 0, x: 104, y: 130.5, o: 0.9 }],
    },
    // Espejo parado delante del bebé (con su pata de atrás).
    { kind: 'line', x2: 8, y2: 18, stroke: 'muted', sw: 2, frames: [{ t: 0, x: 94, y: 110 }] },
    {
      kind: 'rect',
      w: 14,
      h: 21,
      r: 4,
      fill: 'cream',
      stroke: 'sky',
      sw: 2.2,
      frames: [{ t: 0, x: 92, y: 117.5 }],
    },
    // El reflejo de la cara del bebé, que sube cuando levanta la cabeza.
    {
      kind: 'circle',
      r: 3,
      fill: 'cream',
      stroke: 'mint',
      sw: 1.4,
      frames: [
        { t: 0, x: 91, y: 120, o: 0.5 },
        { t: 0.15, x: 91, y: 114, o: 0.9 },
        { t: 0.4, x: 91, y: 114, o: 0.9 },
        { t: 0.52, x: 91, y: 120, o: 0.5 },
        { t: 0.65, x: 91, y: 114, o: 0.9 },
        { t: 0.88, x: 91, y: 114, o: 0.9 },
      ],
    },
    { kind: 'line', x2: 3, y2: -3, stroke: 'sky', sw: 1.2, frames: [{ t: 0, x: 94.5, y: 111.5 }] },
    note(0.05, 0),
    note(0.3, -5),
    note(0.55, 2),
    note(0.75, -4),
    {
      kind: 'figure',
      color: 'mint',
      scale: baby,
      frames: [
        { t: 0, ...babyDown },
        { t: 0.15, ...babyUp },
        { t: 0.4, ...babyUp, rl: [-92, -140] },
        { t: 0.52, ...babyDown },
        { t: 0.65, ...babyUp },
        { t: 0.88, ...babyUp, ll: [-88, -135] },
      ],
    },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...adult },
        { t: 0.25, ...adult, head: 8, ll: [90, 200], rl: [90, 160] },
        { t: 0.5, ...adult },
        { t: 0.75, ...adult, head: 8, ll: [90, 200], rl: [90, 160] },
      ],
    },
  ],
};

export default scene;
