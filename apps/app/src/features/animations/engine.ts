/**
 * Motor de las guías animadas de las actividades (personas palito de colores). Es lógica pura:
 * dado un tiempo `t` entre 0 y 1, calcula dónde está cada articulación y cada objeto. El dibujo
 * lo hace `ActivityScene.tsx`.
 *
 * Coordenadas: un lienzo de 200 × 150, con el piso en y = 130.
 *
 * Ángulos (en grados) de cada segmento del cuerpo, absolutos: 0 = hacia abajo, 90 = hacia la
 * derecha, -90 = hacia la izquierda, 180 = hacia arriba. El torso es distinto: 0 = derecho y los
 * positivos lo inclinan hacia la derecha.
 */

export type Hue =
  | 'coral'
  | 'mint'
  | 'sun'
  | 'sky'
  | 'violet'
  | 'leaf'
  | 'ink'
  | 'muted'
  | 'cream'
  | 'white'
  | 'wood'
  /** Oscuro en los dos temas (sombras, una pantalla apagada); `ink` se aclara en el tema oscuro. */
  | 'night';

/** Ángulos de un brazo o una pierna: [segmento de arriba, segmento de abajo]. */
export type Limb = [number, number];

export interface Pose {
  /** Posición de la cadera. */
  x: number;
  y: number;
  torso: number;
  la: Limb;
  ra: Limb;
  ll: Limb;
  rl: Limb;
  /** Inclinación de la cabeza (grados, relativa al torso). */
  head?: number;
}

export type Keyframe<T> = { t: number } & T;

export interface FigureElement {
  kind: 'figure';
  color: Hue;
  /** 1 = adulto, 0,7 = chico, 0,55 = chico chico. */
  scale?: number;
  frames: Keyframe<Pose>[];
}

/** Lo que se puede animar de un objeto. La forma se dibuja alrededor de (0, 0). */
export interface Motion {
  x: number;
  y: number;
  rot: number;
  s: number;
  o: number;
}

export type ShapeKind = 'rect' | 'circle' | 'ellipse' | 'line' | 'path' | 'text' | 'poly';

export interface ShapeElement {
  kind: ShapeKind;
  fill?: Hue | 'none';
  stroke?: Hue;
  sw?: number;
  /** rect: w, h, r (esquinas) · circle: r · ellipse: rx, ry · line: x2, y2 (desde 0,0). */
  w?: number;
  h?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x2?: number;
  y2?: number;
  /** path: datos SVG · poly: "x,y x,y …" · text: el texto. */
  d?: string;
  points?: string;
  text?: string;
  size?: number;
  frames: Keyframe<Partial<Motion>>[];
}

export type SceneElement = FigureElement | ShapeElement;

export interface Scene {
  /** Duración de una vuelta, en milisegundos. */
  duration: number;
  /** Momento que se muestra quieto (miniaturas y "reducir movimiento"). */
  still: number;
  /** Color del fondo. */
  bg: Hue;
  /** Dibuja el piso (por defecto, sí). */
  ground?: boolean;
  elements: SceneElement[];
}

// ── Interpolación ──────────────────────────────────────────────────────────

const ease = (p: number) => p * p * (3 - 2 * p);

/** Busca los dos cuadros que rodean a `t` (con vuelta: después del último viene el primero). */
function around<T extends { t: number }>(frames: T[], t: number): [T, T, number] {
  if (frames.length === 1) return [frames[0]!, frames[0]!, 0];
  const sorted = frames;
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i]!;
    const b = sorted[i + 1];
    if (b && t >= a.t && t <= b.t) return [a, b, ease((t - a.t) / Math.max(b.t - a.t, 1e-6))];
  }
  // Entre el último y el primero (pasando por 1 → 0).
  const last = sorted[sorted.length - 1]!;
  const first = sorted[0]!;
  const span = 1 - last.t + first.t;
  const into = t >= last.t ? t - last.t : t + 1 - last.t;
  return [last, first, ease(into / Math.max(span, 1e-6))];
}

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const mixLimb = (a: Limb, b: Limb, p: number): Limb => [mix(a[0], b[0], p), mix(a[1], b[1], p)];

export function poseAt(frames: Keyframe<Pose>[], t: number): Pose {
  const [a, b, p] = around(frames, t);
  return {
    x: mix(a.x, b.x, p),
    y: mix(a.y, b.y, p),
    torso: mix(a.torso, b.torso, p),
    la: mixLimb(a.la, b.la, p),
    ra: mixLimb(a.ra, b.ra, p),
    ll: mixLimb(a.ll, b.ll, p),
    rl: mixLimb(a.rl, b.rl, p),
    head: mix(a.head ?? 0, b.head ?? 0, p),
  };
}

const DEFAULT_MOTION: Motion = { x: 0, y: 0, rot: 0, s: 1, o: 1 };

export function motionAt(frames: Keyframe<Partial<Motion>>[], t: number): Motion {
  const [a, b, p] = around(frames, t);
  const full = (f: Partial<Motion>): Motion => ({ ...DEFAULT_MOTION, ...f });
  const fa = full(a);
  const fb = full(b);
  return {
    x: mix(fa.x, fb.x, p),
    y: mix(fa.y, fb.y, p),
    rot: mix(fa.rot, fb.rot, p),
    s: mix(fa.s, fb.s, p),
    o: mix(fa.o, fb.o, p),
  };
}

// ── Esqueleto ──────────────────────────────────────────────────────────────

/** Medidas de un adulto (escala 1). */
export const BODY = { torso: 30, upperArm: 14, forearm: 13, thigh: 16, shin: 16, head: 8 };

type Point = [number, number];
const toward = (from: Point, angle: number, length: number): Point => {
  const rad = (angle * Math.PI) / 180;
  return [from[0] + Math.sin(rad) * length, from[1] + Math.cos(rad) * length];
};

export interface Skeleton {
  hip: Point;
  neck: Point;
  head: Point;
  headR: number;
  elbowL: Point;
  handL: Point;
  elbowR: Point;
  handR: Point;
  kneeL: Point;
  footL: Point;
  kneeR: Point;
  footR: Point;
}

export function skeleton(pose: Pose, scale = 1): Skeleton {
  const k = scale;
  const hip: Point = [pose.x, pose.y];
  // El torso sube desde la cadera: ángulo 180 + inclinación.
  const neck = toward(hip, 180 - pose.torso, BODY.torso * k);
  const headR = BODY.head * k;
  const head = toward(neck, 180 - pose.torso - (pose.head ?? 0), headR + 1.5 * k);
  const elbowL = toward(neck, pose.la[0], BODY.upperArm * k);
  const handL = toward(elbowL, pose.la[1], BODY.forearm * k);
  const elbowR = toward(neck, pose.ra[0], BODY.upperArm * k);
  const handR = toward(elbowR, pose.ra[1], BODY.forearm * k);
  const kneeL = toward(hip, pose.ll[0], BODY.thigh * k);
  const footL = toward(kneeL, pose.ll[1], BODY.shin * k);
  const kneeR = toward(hip, pose.rl[0], BODY.thigh * k);
  const footR = toward(kneeR, pose.rl[1], BODY.shin * k);
  return { hip, neck, head, headR, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR };
}

/** Trazo del cuerpo (sin la cabeza) para un único `<Path>`. */
export function bodyPath(s: Skeleton): string {
  const p = (pt: Point) => `${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`;
  return [
    `M${p(s.hip)}L${p(s.neck)}`,
    `M${p(s.neck)}L${p(s.elbowL)}L${p(s.handL)}`,
    `M${p(s.neck)}L${p(s.elbowR)}L${p(s.handR)}`,
    `M${p(s.hip)}L${p(s.kneeL)}L${p(s.footL)}`,
    `M${p(s.hip)}L${p(s.kneeR)}L${p(s.footR)}`,
  ].join('');
}

/** Altura de la cadera para que los pies toquen el piso (y = 130) estando parado. */
export const standingHip = (scale = 1) => 130 - (BODY.thigh + BODY.shin) * scale + 0.5;
