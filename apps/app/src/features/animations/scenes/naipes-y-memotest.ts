import {
  skeleton,
  type Keyframe,
  type Motion,
  type Pose,
  type Scene,
  type ShapeElement,
} from '../engine';

// Memotest: en el piso frente a las cartas, cada uno da vuelta dos. El adulto no acierta y las
// vuelve a tapar; el chico encuentra el par, festeja y el adulto lo aplaude.
const k = 0.7;
const CARD_Y = 138;

// El adulto, sentado sobre los talones (rodillas en el piso, mirando a la derecha) e inclinado
// hacia las cartas, con las manos listas adelante.
const adultUp: Pose = {
  x: 46,
  y: 121.3,
  torso: 22,
  head: -10,
  la: [15, 35],
  ra: [25, 50],
  ll: [61, -90],
  rl: [58, -89],
};
// Para estirarse hasta una carta despega la cola de los talones (las rodillas quedan en su lugar).
const adultReach: Pose = { ...adultUp, x: 50.7, y: 116, ll: [35.7, -90], rl: [33, -89] };
// El chico, de rodillas mirando a la izquierda.
const kidUp: Pose = {
  x: 146,
  y: 118.8,
  torso: -5,
  la: [-25, -60],
  ra: [-35, -75],
  ll: [-2, 90],
  rl: [2, 88],
};

/** Inclinado hacia una carta, con el brazo derecho estirado hasta ella. */
function reach(base: Pose, scale: number, cardX: number, lean: number): Pose {
  const bent = { ...base, torso: lean, head: -lean / 3 };
  const [nx, ny] = skeleton(bent, scale).neck;
  const angle = (Math.atan2(cardX - nx, CARD_Y - 7 - ny) * 180) / Math.PI;
  return { ...bent, ra: [angle - 8, angle + 8] };
}
const cheer: Pose = { ...kidUp, torso: 0, la: [-150, -175], ra: [150, 175] };
const clap = (open: boolean): Pose => ({
  ...adultUp,
  torso: 10,
  head: 0,
  la: open ? [40, 120] : [40, 135],
  ra: open ? [60, 160] : [55, 140],
});

type Symbol = 'star' | 'dot' | 'heart';
const SYMBOL: Record<Symbol, Omit<ShapeElement, 'frames'>> = {
  star: {
    kind: 'poly',
    points: '0,-4.5 1.3,-1.4 4.3,-1.4 1.9,0.6 2.8,3.8 0,1.9 -2.8,3.8 -1.9,0.6 -4.3,-1.4 -1.3,-1.4',
    fill: 'sun',
  },
  dot: { kind: 'circle', r: 3, fill: 'sky' },
  heart: {
    kind: 'path',
    d: 'M0 3.5 C -6 -1, -3 -5, 0 -2 C 3 -5, 6 -1, 0 3.5 Z',
    fill: 'coral',
  },
};

/** Una carta en el piso: se da vuelta en `up` y se vuelve a tapar en `down`. */
function card(x: number, symbol: Symbol, up?: number, down?: number): ShapeElement[] {
  const face = (visible: boolean): Keyframe<Partial<Motion>>[] => {
    const on = visible ? 1 : 0;
    if (up === undefined || down === undefined) return [{ t: 0, x, y: CARD_Y, o: 1 - on }];
    return [
      { t: 0, x, y: CARD_Y, o: 1 - on },
      { t: up, x, y: CARD_Y, o: 1 - on },
      { t: up + 0.03, x, y: CARD_Y, o: on },
      { t: down, x, y: CARD_Y, o: on },
      { t: down + 0.03, x, y: CARD_Y, o: 1 - on },
    ];
  };
  return [
    {
      kind: 'rect',
      w: 10,
      h: 13,
      r: 2,
      fill: 'violet',
      stroke: 'white',
      sw: 1.2,
      frames: face(false),
    },
    {
      kind: 'rect',
      w: 10,
      h: 13,
      r: 2,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: face(true),
    },
    { ...SYMBOL[symbol], frames: face(true) },
  ];
}

const scene: Scene = {
  duration: 8000,
  still: 0.6,
  bg: 'sun',
  elements: [
    ...card(70, 'dot', 0.09, 0.32),
    ...card(82, 'star', 0.19, 0.32),
    ...card(94, 'heart'),
    ...card(106, 'dot'),
    ...card(118, 'heart', 0.5, 0.9),
    ...card(130, 'heart', 0.4, 0.9),
    {
      kind: 'text',
      text: '¡Par!',
      size: 11,
      fill: 'coral',
      frames: [
        { t: 0, x: 124, y: 72, o: 0 },
        { t: 0.53, x: 124, y: 72, o: 0 },
        { t: 0.57, x: 124, y: 68, o: 1 },
        { t: 0.8, x: 124, y: 68, o: 1 },
        { t: 0.84, x: 124, y: 68, o: 0 },
      ],
    },
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...adultUp },
        { t: 0.06, ...reach(adultReach, 1, 70, 60) },
        { t: 0.12, ...reach(adultReach, 1, 70, 60) },
        { t: 0.16, ...reach(adultReach, 1, 82, 58) },
        { t: 0.22, ...reach(adultReach, 1, 82, 58) },
        { t: 0.27, ...adultUp, head: 4 },
        { t: 0.33, ...adultUp, head: -20 },
        { t: 0.58, ...clap(true) },
        { t: 0.62, ...clap(false) },
        { t: 0.66, ...clap(true) },
        { t: 0.7, ...clap(false) },
        { t: 0.74, ...clap(true) },
        { t: 0.82, ...adultUp },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...kidUp },
        { t: 0.33, ...kidUp },
        { t: 0.38, ...reach(kidUp, k, 130, -65) },
        { t: 0.43, ...reach(kidUp, k, 130, -65) },
        { t: 0.48, ...reach(kidUp, k, 118, -65) },
        { t: 0.53, ...reach(kidUp, k, 118, -65) },
        { t: 0.58, ...cheer },
        { t: 0.64, ...cheer, y: kidUp.y - 3 },
        { t: 0.7, ...cheer },
        { t: 0.8, ...kidUp },
      ],
    },
  ],
};

export default scene;
