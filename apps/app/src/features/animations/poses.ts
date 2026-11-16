import { standingHip, type Keyframe, type Limb, type Pose } from './engine';

/**
 * Poses de base para armar las escenas. Cada una es una función de la posición (x) y la escala:
 * la cadera se ubica sola para que los pies queden en el piso. Para variar una pose, se pisan
 * sus campos: `{ ...stand(60), la: [-150, -170] }`.
 */

type Base = (x: number, scale?: number) => Pose;

const arms = (la: Limb, ra: Limb) => ({ la, ra });

/** Parado, brazos al costado. */
export const stand: Base = (x, k = 1) => ({
  x,
  y: standingHip(k),
  torso: 0,
  ...arms([-14, -8], [14, 8]),
  ll: [-11, -7],
  rl: [11, 7],
});

/** Saludando con el brazo derecho arriba. */
export const wave: Base = (x, k = 1) => ({ ...stand(x, k), ra: [140, 170] });

/** Brazos arriba (festejo o estirarse). */
export const armsUp: Base = (x, k = 1) => ({ ...stand(x, k), la: [-150, -175], ra: [150, 175] });

/** Paso de caminata (dos medios pasos: A y B). */
export const walkA: Base = (x, k = 1) => ({
  x,
  y: standingHip(k) + 0.6 * k,
  torso: 3,
  la: [25, 35],
  ra: [-25, -10],
  ll: [-22, -10],
  rl: [24, 5],
});
export const walkB: Base = (x, k = 1) => ({
  ...walkA(x, k),
  la: [-25, -10],
  ra: [25, 35],
  ll: [24, 5],
  rl: [-22, -10],
});

/** Agachado (rodillas flexionadas), por ejemplo para juntar algo del piso. */
export const crouch: Base = (x, k = 1) => ({
  x,
  y: standingHip(k) + 11 * k,
  torso: 18,
  la: [40, 20],
  ra: [55, 30],
  ll: [-55, 15],
  rl: [60, -5],
});

/** En el aire, con las rodillas arriba (salto). */
export const jump: Base = (x, k = 1) => ({
  x,
  y: standingHip(k) - 14 * k,
  torso: 0,
  la: [-140, -160],
  ra: [140, 160],
  ll: [-30, 10],
  rl: [30, -10],
});

/** En un solo pie (el izquierdo), la otra pierna doblada atrás. */
export const oneFoot: Base = (x, k = 1) => ({
  x,
  y: standingHip(k),
  torso: 0,
  la: [-70, -85],
  ra: [70, 85],
  ll: [-3, 0],
  rl: [40, 150],
});

/** Sentado en el piso con las piernas hacia adelante (a la derecha). */
export const sitFloor: Base = (x, k = 1) => ({
  x,
  y: 128 - 1 * k,
  torso: -4,
  la: [20, 60],
  ra: [35, 75],
  ll: [80, 95],
  rl: [85, 92],
});

/** Sentado en una silla (asiento a la altura de la cadera). */
export const sitChair: Base = (x, k = 1) => ({
  x,
  y: standingHip(k) + 13 * k,
  torso: 0,
  la: [30, 80],
  ra: [40, 85],
  ll: [88, 0],
  rl: [92, 2],
});

/** Acostado boca abajo (panza al piso), cabeza a la derecha. */
export const lieBelly: Base = (x, k = 1) => ({
  x,
  y: 125,
  torso: 88,
  la: [120, 150],
  ra: [110, 140],
  ll: [-88, -95],
  rl: [-92, -98],
  head: -30,
});

/** Con los brazos extendidos al costado (equilibrio, avión). */
export const balance: Base = (x, k = 1) => ({ ...stand(x, k), la: [-90, -95], ra: [90, 95] });

/** Mirando un objeto en la mano (leer, sostener algo adelante). */
export const holdFront: Base = (x, k = 1) => ({ ...stand(x, k), la: [40, 100], ra: [55, 110] });

/** Arma una serie de cuadros equiespaciados entre 0 y 1. */
export function loop(poses: Pose[]): Keyframe<Pose>[] {
  return poses.map((pose, i) => ({ t: i / poses.length, ...pose }));
}
