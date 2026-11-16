import type { Keyframe, Motion, Pose, Scene } from '../engine';
import { stand, walkA, walkB } from '../poses';

// Video familiar: el chico graba con el celular al adulto, que presenta una receta y saluda a
// cámara; después lo miran juntos y se ríen.
const k = 0.8;

// El chico sostiene el celular con las dos manos, a la altura de la cara.
const PHONE = { la: [70, 120] as [number, number], ra: [85, 125] as [number, number] };
const film: Pose = { ...stand(50, k), ...PHONE };
// Dónde queda el celular según la pose (parado o caminando).
const phoneStand = (t: number, x: number): Keyframe<Partial<Motion>> => ({
  t,
  x: x + 21.5,
  y: 77.5,
});
const phoneWalk = (t: number, x: number): Keyframe<Partial<Motion>> => ({ t, x: x + 22.8, y: 78 });

// El adulto revuelve el bol (dos posiciones) y saluda a cámara.
const stirA: Pose = { ...stand(148), ra: [41, -5] };
const stirB: Pose = { ...stand(148), ra: [37, -19] };
const look: Pose = { ...stand(148), torso: -12, la: [-20, -136] };

/** Visible solo entre `from` y `to`. */
const shown = (
  x: number,
  y: number,
  from: number,
  to: number,
  o = 1,
): Keyframe<Partial<Motion>>[] => [
  { t: 0, x, y, o: from === 0 ? o : 0 },
  ...(from === 0
    ? []
    : [
        { t: from, x, y, o: 0 },
        { t: from + 0.03, x, y, o },
      ]),
  { t: to, x, y, o },
  { t: to + 0.03, x, y, o: 0 },
  // Si arranca visible, se queda oculto hasta el final de la vuelta.
  ...(from === 0 ? [{ t: 0.97, x, y, o: 0 }] : []),
];

const scene: Scene = {
  duration: 8000,
  still: 0,
  bg: 'sun',
  elements: [
    // Lo que ve la cámara mientras graba.
    { kind: 'poly', points: '0,0 64,-46 64,40', fill: 'sky', frames: shown(77, 77, 0, 0.48, 0.2) },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...stirA, la: [-140, -170] },
        { t: 0.06, ...stirB, la: [-125, -145] },
        { t: 0.12, ...stirA, la: [-140, -170] },
        { t: 0.18, ...stirB, la: [-125, -145] },
        { t: 0.24, ...stirA },
        { t: 0.3, ...stirB },
        { t: 0.36, ...stirA },
        { t: 0.42, ...stirB },
        { t: 0.48, ...stirA },
        { t: 0.62, ...look },
        { t: 0.72, ...look, torso: -9 },
        { t: 0.78, ...look },
        { t: 0.84, ...look, torso: -9 },
        { t: 0.92, ...stirA },
      ],
    },
    // Mesa (adelante del adulto) con el bol.
    { kind: 'rect', w: 48, h: 4, r: 2, fill: 'wood', frames: [{ t: 0, x: 150, y: 101 }] },
    { kind: 'line', x2: 0, y2: 27, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 130, y: 103 }] },
    { kind: 'line', x2: 0, y2: 27, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 170, y: 103 }] },
    { kind: 'path', d: 'M-9 0 A9 6.5 0 0 0 9 0 Z', fill: 'sky', frames: [{ t: 0, x: 154, y: 93 }] },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...film },
        { t: 0.5, ...film },
        { t: 0.54, ...walkA(70, k), ...PHONE },
        { t: 0.6, ...walkB(88, k), ...PHONE },
        { t: 0.66, ...stand(100, k), ...PHONE },
        { t: 0.86, ...stand(100, k), ...PHONE },
        { t: 0.89, ...walkB(84, k), ...PHONE },
        { t: 0.95, ...walkA(66, k), ...PHONE },
      ],
    },
    // El celular.
    {
      kind: 'rect',
      w: 12,
      h: 7,
      r: 1.5,
      fill: 'ink',
      frames: [
        phoneStand(0, 50),
        phoneStand(0.5, 50),
        phoneWalk(0.54, 70),
        phoneWalk(0.6, 88),
        phoneStand(0.66, 100),
        phoneStand(0.86, 100),
        phoneWalk(0.89, 84),
        phoneWalk(0.95, 66),
      ],
    },
    // Grabando: punto rojo que titila.
    {
      kind: 'circle',
      r: 2.2,
      fill: 'coral',
      frames: [
        ...[0, 0.08, 0.16, 0.24, 0.32, 0.4].flatMap((at) => [
          { t: at, x: 63, y: 65, o: 1 },
          { t: at + 0.04, x: 63, y: 65, o: 0.2 },
        ]),
        { t: 0.46, x: 63, y: 65, o: 0 },
        { t: 0.97, x: 63, y: 65, o: 0 },
      ],
    },
    { kind: 'text', text: 'REC', size: 8, fill: 'coral', frames: shown(74, 68, 0, 0.46) },
    // Mirando el resultado: el video se reproduce y se ríen.
    {
      kind: 'poly',
      points: '-1.8,-2.3 2.6,0 -1.8,2.3',
      fill: 'sun',
      frames: shown(121.8, 77.5, 0.66, 0.85),
    },
    { kind: 'text', text: '¡ja, ja!', size: 10, fill: 'coral', frames: shown(112, 50, 0.7, 0.85) },
  ],
};

export default scene;
