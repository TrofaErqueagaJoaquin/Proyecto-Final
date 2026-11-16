import type { Pose, Scene } from '../engine';
import { stand } from '../poses';

// Estación de piso: el bebé juega boca abajo en su manta (patalea y sacude un sonajero) mientras
// el adulto cocina en la mesada, a la vista, y lo saluda.
const baby = 0.55;
// Boca abajo, apoyado en los antebrazos y con la cabeza levantada (mira a la derecha).
const B: Pose = {
  x: 118,
  y: 125.5,
  torso: 75,
  la: [15, 90],
  ra: [15, 90],
  ll: [-88, -95],
  rl: [-92, -98],
  head: -30,
};
const kickA: Pose = { ...B, ll: [-80, -150] };
const kickB: Pose = { ...B, rl: [-84, -150] };
const A = stand(36);
const stirA: Pose = { ...A, la: [-3, 43], ra: [19, 61] };
const stirB: Pose = { ...A, la: [-3, 43], ra: [-1, 60] };

const scene: Scene = {
  duration: 8000,
  still: 0.42,
  bg: 'mint',
  elements: [
    // La manta con dos juguetes más.
    { kind: 'rect', w: 94, h: 4, r: 2, fill: 'sun', frames: [{ t: 0, x: 139, y: 128.5 }] },
    { kind: 'circle', r: 4.5, fill: 'coral', frames: [{ t: 0, x: 168, y: 122 }] },
    { kind: 'rect', w: 7, h: 8, r: 1.5, fill: 'leaf', frames: [{ t: 0, x: 179, y: 122.5 }] },
    // Sonajero: el bebé lo levanta y lo sacude.
    {
      kind: 'path',
      d: 'M0 6 L0 0 M-3.2 -3 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0',
      fill: 'sky',
      stroke: 'sky',
      sw: 1.6,
      frames: [
        { t: 0, x: 151, y: 124.5, rot: 90 },
        { t: 0.24, x: 151, y: 124.5, rot: 90 },
        { t: 0.32, x: 142, y: 107, rot: 0 },
        { t: 0.4, x: 137.3, y: 106.3, rot: -20 },
        { t: 0.48, x: 145.7, y: 108.3, rot: 20 },
        { t: 0.56, x: 137.3, y: 106.3, rot: -20 },
        { t: 0.64, x: 151, y: 124.5, rot: 90 },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: baby,
      frames: [
        { t: 0, ...B },
        { t: 0.08, ...kickA },
        { t: 0.16, ...kickB },
        { t: 0.24, ...B, ra: [42, 106] },
        { t: 0.32, ...B, ra: [106, 175] },
        { t: 0.4, ...kickA, ra: [116, 195] },
        { t: 0.48, ...kickB, ra: [102, 159] },
        { t: 0.56, ...B, ra: [116, 195] },
        { t: 0.64, ...B, ra: [42, 106] },
        { t: 0.72, ...B, head: -45 },
        { t: 0.8, ...kickA },
        { t: 0.88, ...kickB },
      ],
    },
    // El adulto revuelve en un bol y saluda al bebé cuando lo ve jugar.
    {
      kind: 'figure',
      color: 'coral',
      frames: [
        { t: 0, ...stirA },
        { t: 0.08, ...stirB },
        { t: 0.16, ...stirA },
        { t: 0.24, ...stirB },
        { t: 0.32, ...stirA },
        { t: 0.38, ...stirA, ra: [140, 170] },
        { t: 0.44, ...stirA, ra: [128, 150] },
        { t: 0.5, ...stirA, ra: [140, 170] },
        { t: 0.56, ...stirA },
        { t: 0.64, ...stirB },
        { t: 0.72, ...stirA },
        { t: 0.8, ...stirB },
        { t: 0.88, ...stirA },
        { t: 0.94, ...stirB },
      ],
    },
    // La mesada (tapa las piernas del adulto) y el bol.
    {
      kind: 'rect',
      w: 48,
      h: 37,
      r: 1.5,
      fill: 'cream',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 38, y: 113.5 }],
    },
    {
      kind: 'path',
      d: 'M0 -11 V13 M-4 0 V3 M4 0 V3',
      fill: 'none',
      stroke: 'muted',
      sw: 1.2,
      frames: [{ t: 0, x: 38, y: 114 }],
    },
    { kind: 'rect', w: 54, h: 4, r: 1.5, fill: 'wood', frames: [{ t: 0, x: 38, y: 95 }] },
    {
      kind: 'path',
      d: 'M-8 -3 Q -8 5, 0 5 Q 8 5, 8 -3 Z',
      fill: 'sky',
      frames: [{ t: 0, x: 50, y: 88 }],
    },
  ],
};

export default scene;
