import type { Scene } from '../engine';
import { crouch, stand } from '../poses';

// ¿Flota o se hunde?: un chico tira objetos en un recipiente; el corcho flota y la cuchara se hunde.
const k = 0.7;
const scene: Scene = {
  duration: 6000,
  still: 0.3,
  bg: 'sky',
  elements: [
    // Recipiente con agua.
    {
      kind: 'rect',
      w: 64,
      h: 34,
      r: 6,
      fill: 'cream',
      stroke: 'muted',
      sw: 2.5,
      frames: [{ t: 0, x: 130, y: 113 }],
    },
    { kind: 'rect', w: 58, h: 22, r: 4, fill: 'sky', frames: [{ t: 0, x: 130, y: 118, o: 0.55 }] },
    // Corcho: cae y queda flotando (sube y baja).
    {
      kind: 'rect',
      w: 9,
      h: 7,
      r: 2,
      fill: 'wood',
      frames: [
        { t: 0, x: 100, y: 70, o: 0 },
        { t: 0.1, x: 100, y: 70, o: 1 },
        { t: 0.2, x: 118, y: 106 },
        { t: 0.3, x: 118, y: 108 },
        { t: 0.4, x: 118, y: 105 },
        { t: 0.5, x: 118, y: 107 },
        { t: 0.95, x: 118, y: 106, o: 1 },
        { t: 0.99, x: 118, y: 106, o: 0 },
      ],
    },
    // Cuchara: cae y se va al fondo.
    {
      kind: 'path',
      d: 'M-8 0 L4 0 M4 0 a4 3 0 1 0 0.1 0',
      fill: 'none',
      stroke: 'ink',
      sw: 2.5,
      frames: [
        { t: 0, x: 100, y: 70, o: 0 },
        { t: 0.45, x: 100, y: 70, o: 0 },
        { t: 0.52, x: 100, y: 70, o: 1, rot: 0 },
        { t: 0.62, x: 140, y: 108, rot: 40 },
        { t: 0.75, x: 142, y: 124, rot: 80 },
        { t: 0.95, x: 142, y: 124, rot: 80, o: 1 },
        { t: 0.99, x: 142, y: 124, rot: 80, o: 0 },
      ],
    },
    // Signos: "flota" (↑) y "se hunde" (↓).
    {
      kind: 'text',
      text: '¡Flota!',
      size: 10,
      fill: 'mint',
      frames: [
        { t: 0, x: 118, y: 90, o: 0 },
        { t: 0.28, x: 118, y: 90, o: 0 },
        { t: 0.34, x: 118, y: 88, o: 1 },
        { t: 0.5, x: 118, y: 88, o: 1 },
        { t: 0.56, x: 118, y: 88, o: 0 },
      ],
    },
    {
      kind: 'text',
      text: '¡Se hunde!',
      size: 10,
      fill: 'coral',
      frames: [
        { t: 0, x: 150, y: 90, o: 0 },
        { t: 0.72, x: 150, y: 90, o: 0 },
        { t: 0.78, x: 150, y: 88, o: 1 },
        { t: 0.93, x: 150, y: 88, o: 1 },
        { t: 0.98, x: 150, y: 88, o: 0 },
      ],
    },
    {
      kind: 'figure',
      color: 'violet',
      scale: k,
      frames: [
        { t: 0, ...stand(70, k), ra: [120, 110] },
        { t: 0.1, ...stand(70, k), ra: [80, 70] },
        { t: 0.25, ...crouch(72, k) },
        { t: 0.42, ...stand(70, k), ra: [120, 110] },
        { t: 0.52, ...stand(70, k), ra: [80, 70] },
        { t: 0.7, ...crouch(72, k) },
        { t: 0.9, ...stand(70, k), la: [-150, -175], ra: [150, 175] },
      ],
    },
  ],
};

export default scene;
