import { BODY, type Limb, type Pose, type Scene } from '../engine';
import { armsUp, jump, stand, walkA, walkB } from '../poses';

// Circuito en el living: el chico camina por la cinta como equilibrista, salta el almohadón, gatea
// por debajo de la mesa y festeja con el adulto; después vuelve caminando a la largada.
const k = 0.7;
const FLOOR = 130.5;
const balanceArms = { la: [-90, -95], ra: [90, 95] } as const;
const onTape = (pose: Pose): Pose => ({
  ...pose,
  la: [...balanceArms.la],
  ra: [...balanceArms.ra],
});
/** La misma pose mirando hacia el otro lado (para volver caminando a la izquierda). */
const flip = (p: Pose): Pose => ({
  ...p,
  torso: -p.torso,
  head: -(p.head ?? 0),
  la: [-p.la[0], -p.la[1]],
  ra: [-p.ra[0], -p.ra[1]],
  ll: [-p.ll[0], -p.ll[1]],
  rl: [-p.rl[0], -p.rl[1]],
});

/** Ángulos de una pierna del chico para que el pie quede en el piso en `footX` (rodilla adelante). */
function legTo(x: number, y: number, footX: number): Limb {
  const len = BODY.thigh * k;
  const dx = footX - x;
  const dy = FLOOR - y;
  const d = Math.min(Math.hypot(dx, dy), 2 * len - 0.01);
  const deg = (rad: number) => (rad * 180) / Math.PI;
  const upper = Math.atan2(dx, dy) + Math.acos(d / (2 * len));
  const knee = [x + Math.sin(upper) * len, y + Math.cos(upper) * len] as const;
  return [deg(upper), deg(Math.atan2(footX - knee[0], FLOOR - knee[1]))];
}
/** En cuclillas, con los dos pies apoyados (para tomar impulso o al caer del salto). */
const squat = (x: number, footL: number, footR: number, torso = 20, y = 114): Pose => ({
  x,
  y,
  torso,
  la: [40, 20],
  ra: [55, 30],
  ll: legTo(x, y, footL),
  rl: legTo(x, y, footR),
});
// Gateando (manos y rodillas en el piso), en dos tiempos.
const crawlA = (x: number): Pose => ({
  x,
  y: 118.8,
  torso: 68,
  head: -20,
  la: [14, 2],
  ra: [-8, -4],
  ll: [-6, -92],
  rl: [8, -86],
});
const crawlB = (x: number): Pose => ({
  ...crawlA(x),
  la: [-8, -4],
  ra: [14, 2],
  ll: [8, -86],
  rl: [-6, -92],
});
// Para levantarse después de gatear: de rodillas, adelanta un pie, lo apoya y se para.
const kneelTall = (x: number): Pose => ({
  x,
  y: 118.8,
  torso: 12,
  la: [20, 10],
  ra: [35, 20],
  ll: [-2, -90],
  rl: [4, -88],
});
const footForward = (x: number): Pose => ({
  ...kneelTall(x),
  y: 118,
  torso: 15,
  la: [35, 25],
  rl: [60, -60],
});
const halfKneel = (x: number): Pose => ({
  x,
  y: 117,
  torso: 10,
  la: [30, 60],
  ra: [40, 80],
  ll: [-10, -90],
  rl: [78, 0],
});
const rising = (x: number, back: number, front: number): Pose => ({
  x,
  y: 111,
  torso: 5,
  la: [15, 10],
  ra: [25, 20],
  ll: legTo(x, 111, back),
  rl: legTo(x, 111, front),
});

// El adulto alienta con el brazo del lado del chico.
const cheer: Pose = { ...stand(183), la: [-140, -170] };

// La mesa: el chico gatea por debajo y se para recién cuando la pasó.
const TABLE = { x: 133, left: 119, right: 147 };

// La vuelta a la largada, caminando: medios pasos de 16 desde x = 157 hasta x = 30.
const walkBack = Array.from({ length: 7 }, (_, i) => {
  const x = 141.1 - 15.9 * i;
  return { t: 0.805 + 0.0245 * i, ...flip(i % 2 === 0 ? walkA(x, k) : walkB(x, k)) };
});

const scene: Scene = {
  duration: 8000,
  still: 0.245,
  bg: 'mint',
  elements: [
    // Línea de cinta en el piso.
    { kind: 'rect', w: 36, h: 3, r: 1.5, fill: 'sun', frames: [{ t: 0, x: 43, y: 130.5 }] },
    // Almohadón para saltar.
    { kind: 'rect', w: 18, h: 8, r: 3, fill: 'coral', frames: [{ t: 0, x: 76, y: 126 }] },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...onTape(stand(30, k)) },
        { t: 0.04, ...onTape(walkA(37, k)) },
        { t: 0.08, ...onTape(walkB(44, k)) },
        { t: 0.12, ...onTape(walkA(51, k)) },
        { t: 0.16, ...onTape(walkB(57, k)) },
        { t: 0.2, ...squat(62, 66, 54) },
        { t: 0.245, ...jump(76, k) },
        { t: 0.29, ...squat(88, 86, 93, 12) },
        // Se agacha con la cabeza baja y apoya las rodillas sin mover los pies.
        { t: 0.315, ...squat(89, 85, 88, 70, 119), head: -25, la: [20, 5], ra: [35, 15] },
        { t: 0.34, ...crawlA(96) },
        { t: 0.38, ...crawlB(104.5) },
        { t: 0.42, ...crawlA(113) },
        { t: 0.46, ...crawlB(121.5) },
        { t: 0.5, ...crawlA(130) },
        { t: 0.54, ...crawlB(138.5) },
        { t: 0.58, ...crawlA(146) },
        // Del otro lado de la mesa se levanta de a poco: de rodillas, un pie adelante y arriba.
        { t: 0.61, ...kneelTall(152) },
        { t: 0.635, ...footForward(153) },
        { t: 0.66, ...halfKneel(154) },
        { t: 0.685, ...rising(157, 148, 163) },
        { t: 0.715, ...armsUp(157, k) },
        { t: 0.745, ...jump(157, k) },
        { t: 0.775, ...armsUp(157, k) },
        ...walkBack,
      ],
    },
    // La mesa (va después del chico: al volver, pasa por detrás).
    { kind: 'rect', w: 3, h: 32, fill: 'wood', frames: [{ t: 0, x: TABLE.left, y: 114 }] },
    { kind: 'rect', w: 3, h: 32, fill: 'wood', frames: [{ t: 0, x: TABLE.right, y: 114 }] },
    { kind: 'rect', w: 36, h: 5, r: 1.5, fill: 'wood', frames: [{ t: 0, x: TABLE.x, y: 96 }] },
    {
      kind: 'figure',
      color: 'sky',
      frames: [
        { t: 0, ...stand(183) },
        { t: 0.25, ...cheer },
        { t: 0.35, ...cheer, la: [-120, -160] },
        { t: 0.45, ...cheer },
        { t: 0.55, ...cheer, la: [-120, -160] },
        { t: 0.65, ...cheer },
        { t: 0.8, ...cheer },
        { t: 0.86, ...stand(183) },
      ],
    },
  ],
};

export default scene;
