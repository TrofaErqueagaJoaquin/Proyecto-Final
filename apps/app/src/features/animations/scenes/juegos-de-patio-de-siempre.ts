import type { Keyframe, Motion, Pose, Scene, ShapeElement } from '../engine';
import { jump, stand } from '../poses';

// Juegos de patio de siempre (el elástico): el adulto y un chico sostienen el elástico con los
// tobillos y otro chico salta: afuera, adentro y arriba del elástico, que se estira cuando lo pisa.
const k = 0.7;

// Los que sostienen, con las piernas abiertas (el elástico pasa por sus tobillos).
const adultHold: Pose = { ...stand(34), y: 98.7, ll: [-14, -10], rl: [16, 12] };
// El adulto marca el ritmo aplaudiendo, con las manos hacia el que salta.
const adultClapOpen: Pose = { ...adultHold, la: [89, 33], ra: [91, 136] };
const adultClap: Pose = { ...adultHold, la: [103, 61], ra: [105, 74] };
const kidHold: Pose = {
  ...stand(166, k),
  y: 108.3,
  ll: [-16, -12],
  rl: [14, 10],
  la: [-35, 30],
  ra: [35, -30],
};

// El que salta, en el medio.
const X = 100;
const onGround: Pose = {
  ...stand(X, k),
  y: 108.8,
  ll: [-22, -16],
  rl: [22, 16],
  la: [-60, -80],
  ra: [60, 80],
};
const onElastic: Pose = { ...stand(X, k), y: 107.6, la: [-90, -100], ra: [90, 100] };
const inAir: Pose = { ...jump(X, k), la: [-120, -140], ra: [120, 140] };

// Elástico: dos tiras (atrás y adelante), cada una en dos tramos que se unen en el medio.
const LEFT = 41.5;
const RIGHT = 160.8;
const DIP_AT = [0.2, 0.6];
/** Inclinación de un tramo para que el punto del medio baje `dip` px. */
const tilt = (span: number, dip: number) => (Math.atan2(dip, span) * 180) / Math.PI;
const strand = (y: number, dip: number, side: 'left' | 'right'): ShapeElement => {
  const span = side === 'left' ? X - LEFT : RIGHT - X;
  const sign = side === 'left' ? 1 : -1;
  const at = side === 'left' ? LEFT : RIGHT;
  const frames: Keyframe<Partial<Motion>>[] = [{ t: 0, x: at, y, rot: 0 }];
  for (const d of DIP_AT) {
    // Se estira solo mientras el que salta está parado arriba.
    frames.push(
      { t: d - 0.04, x: at, y, rot: 0 },
      { t: d, x: at, y, rot: sign * tilt(span, dip) },
      { t: d + 0.04, x: at, y, rot: 0 },
    );
  }
  return { kind: 'line', x2: sign * span, y2: 0, stroke: 'coral', sw: 2, frames };
};

// Rayitas del aplauso, cada vez que el que salta cae.
const LANDINGS = [0, 0.2, 0.4, 0.6, 0.8];
const clapBurst: ShapeElement = {
  kind: 'path',
  d: 'M-6 -1 L-10 -3 M6 -1 L10 -3 M-4 -6 L-6 -9 M4 -6 L6 -9',
  fill: 'none',
  stroke: 'coral',
  sw: 1.6,
  frames: [
    ...LANDINGS.flatMap((at) => [
      ...(at > 0 ? [{ t: at - 0.02, x: 66, y: 72, o: 0 }] : []),
      { t: at, x: 66, y: 72, o: 1 },
      { t: at + 0.04, x: 66, y: 72, o: 0 },
    ]),
    { t: 0.98, x: 66, y: 72, o: 0 },
  ],
};

const scene: Scene = {
  duration: 4800,
  still: 0.3,
  bg: 'mint',
  elements: [
    strand(123, 5, 'left'),
    strand(123, 5, 'right'),
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...onGround },
        { t: 0.1, ...inAir },
        { t: 0.2, ...onElastic },
        { t: 0.3, ...inAir },
        { t: 0.4, ...onGround },
        { t: 0.5, ...inAir },
        { t: 0.6, ...onElastic },
        { t: 0.7, ...inAir },
        { t: 0.8, ...onGround, la: [-135, -155], ra: [135, 155] },
        { t: 0.9, ...inAir },
      ],
    },
    strand(127, 3, 'left'),
    strand(127, 3, 'right'),
    {
      kind: 'figure',
      color: 'coral',
      frames: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t, i) => ({
        t,
        ...(i % 2 === 0 ? adultClap : adultClapOpen),
      })),
    },
    clapBurst,
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...kidHold },
        { t: 0.25, ...kidHold, torso: -4 },
        { t: 0.5, ...kidHold },
        { t: 0.75, ...kidHold, torso: 4 },
      ],
    },
  ],
};

export default scene;
