import type { Scene, ShapeElement } from '../engine';
import { jump, oneFoot, stand, walkA, walkB } from '../poses';

// Avioncito (rayuela): un chico salta los casilleros (en un pie y con los dos) y vuelve caminando.
const k = 0.7;
const squares: ShapeElement[] = [40, 62, 84, 106, 128, 150].map((x, i) => ({
  kind: 'rect',
  w: 20,
  h: 8,
  r: 2,
  fill: 'none',
  stroke: i % 2 === 0 ? 'coral' : 'sky',
  sw: 2,
  frames: [{ t: 0, x, y: 135 }],
}));
const numbers: ShapeElement[] = [40, 62, 84, 106, 128, 150].map((x, i) => ({
  kind: 'text',
  text: String(i + 1),
  size: 8,
  fill: 'muted',
  frames: [{ t: 0, x, y: 145 }],
}));

const scene: Scene = {
  duration: 5200,
  still: 0.18,
  bg: 'sun',
  elements: [
    ...squares,
    ...numbers,
    // La tapita en el casillero 3.
    { kind: 'circle', r: 2.6, fill: 'coral', frames: [{ t: 0, x: 84, y: 135 }] },
    {
      kind: 'figure',
      color: 'mint',
      scale: k,
      frames: [
        { t: 0, ...stand(30, k) },
        { t: 0.08, ...jump(40, k) },
        { t: 0.16, ...oneFoot(40, k) },
        { t: 0.24, ...jump(51, k) },
        { t: 0.32, ...oneFoot(62, k) },
        { t: 0.4, ...jump(84, k) },
        { t: 0.48, ...stand(106, k), la: [-100, -120], ra: [100, 120] },
        { t: 0.56, ...jump(117, k) },
        { t: 0.64, ...oneFoot(128, k) },
        { t: 0.72, ...jump(139, k) },
        { t: 0.8, ...stand(150, k), la: [-150, -175], ra: [150, 175] },
        { t: 0.86, ...walkA(120, k) },
        { t: 0.93, ...walkB(75, k) },
      ],
    },
  ],
};

export default scene;
