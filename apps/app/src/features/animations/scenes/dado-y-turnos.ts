import type { Keyframe, Motion, Pose, Scene } from '../engine';
import { jump, stand } from '../poses';

// Dado y turnos: la flecha marca de quién es el turno; el chico tira el dado y sale 2 (¡saltar!),
// después tira el adulto y sale 1 (¡aplaudir!).
const k = 0.7;

/** Puntos de una cara del dado (un círculo por punto). */
const pips = (points: [number, number][]) =>
  points.map(([x, y]) => `M${x - 1.4} ${y} a1.4 1.4 0 1 0 2.8 0 a1.4 1.4 0 1 0 -2.8 0`).join(' ');

/** Aparece en `from` y desaparece en `to`. */
const shown = (x: number, y: number, from: number, to: number): Keyframe<Partial<Motion>>[] => [
  { t: 0, x, y, o: 0 },
  { t: from, x, y, o: 0 },
  { t: from + 0.03, x, y, o: 1 },
  { t: to, x, y, o: 1 },
  { t: to + 0.03, x, y, o: 0 },
];

// El dado: en la mano del chico, vuela a la mesa (sale 2), lo agarra el adulto, lo tira (sale 1)
// y lo vuelve a agarrar el chico.
const die: Keyframe<Partial<Motion>>[] = [
  { t: 0, x: 112, y: 89, rot: 0 },
  { t: 0.04, x: 136, y: 103, rot: 0 },
  { t: 0.08, x: 114, y: 77, rot: -60 },
  { t: 0.11, x: 105, y: 66, rot: -200 },
  { t: 0.15, x: 96, y: 93, rot: -360 },
  { t: 0.47, x: 96, y: 93, rot: -360 },
  { t: 0.52, x: 91, y: 83, rot: -360 },
  { t: 0.56, x: 67, y: 94, rot: -360 },
  { t: 0.6, x: 93, y: 55, rot: -300 },
  { t: 0.63, x: 100, y: 50, rot: -150 },
  { t: 0.67, x: 106, y: 93, rot: 0 },
  { t: 0.95, x: 106, y: 93, rot: 0 },
];
// Qué cara se ve: el 2 en la primera tirada y el 1 en la segunda (cambia cuando está en la mano).
const face = (from: number, to: number) =>
  die.map((f) => ({ ...f, o: f.t >= from && f.t <= to ? 1 : 0 }));
const two = face(0, 0.47);
const one = face(0.52, 0.95);

const kidReady: Pose = { ...stand(130, k), la: [-60, -100] };
// Aplauso con las manos hacia adelante (uno frente al otro): abiertas y juntas.
const adultClapOpen: Pose = { ...stand(70), la: [89, 33], ra: [91, 136] };
const adultClap: Pose = { ...stand(70), la: [103, 61], ra: [105, 74] };
const kidClapOpen: Pose = { ...stand(130, k), la: [-104, -48], ra: [-106, -150] };
const kidClap: Pose = { ...stand(130, k), la: [-120, -78], ra: [-122, -92] };

/** Rayitas del aplauso, cuando las manos se juntan. */
const clapBurst = (x: number, y: number, s: number) => ({
  kind: 'path' as const,
  d: 'M-6 -1 L-10 -3 M6 -1 L10 -3 M-4 -6 L-6 -9 M4 -6 L6 -9',
  fill: 'none' as const,
  stroke: 'coral' as const,
  sw: 1.6,
  frames: [0.74, 0.82].flatMap((at) => [
    { t: at - 0.02, x, y, s, o: 0 },
    { t: at, x, y, s, o: 1 },
    { t: at + 0.025, x, y, s, o: 0 },
  ]),
});

const scene: Scene = {
  duration: 8000,
  still: 0.22,
  bg: 'sun',
  elements: [
    // Mesita.
    { kind: 'line', x2: 0, y2: 28, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 88, y: 102 }] },
    { kind: 'line', x2: 0, y2: 28, stroke: 'wood', sw: 2.5, frames: [{ t: 0, x: 112, y: 102 }] },
    { kind: 'rect', w: 36, h: 4, r: 2, fill: 'wood', frames: [{ t: 0, x: 100, y: 101 }] },
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...stand(70) },
        { t: 0.16, ...stand(70) },
        { t: 0.2, ...jump(70) },
        { t: 0.25, ...stand(70) },
        { t: 0.3, ...jump(70) },
        { t: 0.35, ...stand(70) },
        { t: 0.42, ...stand(70) },
        // Agarra el dado de la mesa y lo tira.
        { t: 0.47, ...stand(70), torso: 15, ra: [33, 48] },
        { t: 0.52, ...stand(70), ra: [40, 70] },
        { t: 0.56, ...stand(70), ra: [-15, 0] },
        { t: 0.6, ...stand(70), ra: [110, 130] },
        { t: 0.66, ...stand(70) },
        { t: 0.7, ...adultClapOpen },
        { t: 0.74, ...adultClap },
        { t: 0.78, ...adultClapOpen },
        { t: 0.82, ...adultClap },
        { t: 0.86, ...adultClapOpen },
        { t: 0.9, ...stand(70) },
      ],
    },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...kidReady },
        { t: 0.04, ...stand(130, k), la: [30, 10] },
        { t: 0.08, ...stand(130, k), la: [-110, -130] },
        { t: 0.14, ...stand(130, k) },
        { t: 0.2, ...jump(130, k) },
        { t: 0.25, ...stand(130, k) },
        { t: 0.3, ...jump(130, k) },
        { t: 0.35, ...stand(130, k) },
        { t: 0.66, ...stand(130, k) },
        { t: 0.7, ...kidClapOpen },
        { t: 0.74, ...kidClap },
        { t: 0.78, ...kidClapOpen },
        { t: 0.82, ...kidClap },
        { t: 0.86, ...kidClapOpen },
        { t: 0.9, ...stand(130, k) },
        // Agarra el dado para su turno.
        { t: 0.95, ...stand(130, k), torso: -15, la: [-63, -104] },
      ],
    },
    // Dado (cuadrado y puntos, que giran juntos).
    { kind: 'rect', w: 12, h: 12, r: 2.5, fill: 'cream', stroke: 'ink', sw: 1.6, frames: die },
    {
      kind: 'path',
      d: pips([
        [-3, -3],
        [3, 3],
      ]),
      fill: 'ink',
      frames: two,
    },
    { kind: 'path', d: pips([[0, 0]]), fill: 'ink', frames: one },
    // Lo que manda cada número.
    { kind: 'text', text: '¡saltar!', size: 11, fill: 'coral', frames: shown(110, 26, 0.16, 0.42) },
    {
      kind: 'text',
      text: '¡aplaudir!',
      size: 11,
      fill: 'coral',
      frames: shown(110, 26, 0.68, 0.9),
    },
    clapBurst(102, 70, 1),
    clapBurst(107, 80, 0.7),
    // La flecha del turno: arriba del chico, pasa al adulto y, cuando el dado cae, vuelve al chico.
    {
      kind: 'poly',
      points: '-4.5,-3 4.5,-3 0,3.5',
      fill: 'coral',
      frames: [
        { t: 0, x: 130, y: 48 },
        { t: 0.4, x: 130, y: 48 },
        { t: 0.43, x: 100, y: 30 },
        { t: 0.46, x: 70, y: 33 },
        { t: 0.66, x: 70, y: 33 },
        { t: 0.69, x: 100, y: 30 },
        { t: 0.72, x: 130, y: 48 },
      ],
    },
  ],
};

export default scene;
