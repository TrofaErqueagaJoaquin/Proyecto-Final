import type { Scene } from './engine';
import { armsUp, crouch, holdFront, jump, sitFloor, stand, walkA, walkB, wave } from './poses';

/**
 * Escenas genéricas por tipo de actividad: las usan las actividades nuevas que se cargan desde el
 * panel de contenidos (todavía sin escena propia).
 */
const adult = 1;
const kid = 0.7;

export const GENERIC: Record<string, Scene> = {
  movimiento: {
    duration: 2600,
    still: 0.5,
    bg: 'mint',
    elements: [
      {
        kind: 'figure',
        color: 'coral',
        frames: [
          { t: 0, ...stand(70, adult) },
          { t: 0.5, ...jump(70, adult) },
        ],
      },
      {
        kind: 'figure',
        color: 'mint',
        scale: kid,
        frames: [
          { t: 0, ...jump(125, kid) },
          { t: 0.5, ...stand(125, kid) },
        ],
      },
    ],
  },
  calma: {
    duration: 6000,
    still: 0.3,
    bg: 'sky',
    elements: [
      {
        kind: 'circle',
        r: 26,
        fill: 'sky',
        frames: [
          { t: 0, x: 100, y: 60, s: 0.7, o: 0.25 },
          { t: 0.5, x: 100, y: 60, s: 1.25, o: 0.4 },
        ],
      },
      {
        kind: 'figure',
        color: 'sky',
        scale: kid,
        frames: [
          { t: 0, ...sitFloor(92, kid) },
          { t: 0.5, ...sitFloor(92, kid), la: [-150, -175], ra: [150, 175] },
        ],
      },
    ],
  },
  lenguaje: {
    duration: 3000,
    still: 0.25,
    bg: 'coral',
    elements: [
      {
        kind: 'rect',
        w: 22,
        h: 14,
        r: 4,
        fill: 'cream',
        stroke: 'coral',
        frames: [{ t: 0, x: 100, y: 72 }],
      },
      {
        kind: 'figure',
        color: 'coral',
        frames: [
          { t: 0, ...holdFront(78, adult) },
          { t: 0.5, ...holdFront(78, adult), head: 8 },
        ],
      },
      {
        kind: 'figure',
        color: 'mint',
        scale: kid,
        frames: [
          { t: 0, ...stand(125, kid), head: -10 },
          { t: 0.5, ...wave(125, kid) },
        ],
      },
    ],
  },
  vinculo: {
    duration: 3000,
    still: 0.5,
    bg: 'coral',
    elements: [
      {
        kind: 'path',
        d: 'M0 4 C -6 -2, -10 6, 0 12 C 10 6, 6 -2, 0 4 Z',
        fill: 'coral',
        frames: [
          { t: 0, x: 100, y: 40, s: 0.8 },
          { t: 0.5, x: 100, y: 36, s: 1.2 },
        ],
      },
      {
        kind: 'figure',
        color: 'coral',
        frames: [
          { t: 0, ...stand(80, adult), ra: [60, 70] },
          { t: 0.5, ...stand(82, adult), ra: [70, 80] },
        ],
      },
      {
        kind: 'figure',
        color: 'mint',
        scale: kid,
        frames: [
          { t: 0, ...stand(112, kid), la: [-60, -70] },
          { t: 0.5, ...stand(110, kid), la: [-70, -80] },
        ],
      },
    ],
  },
  exploracion: {
    duration: 4000,
    still: 0.25,
    bg: 'leaf',
    elements: [
      { kind: 'circle', r: 6, fill: 'sun', frames: [{ t: 0, x: 150, y: 124 }] },
      {
        kind: 'figure',
        color: 'leaf',
        scale: kid,
        frames: [
          { t: 0, ...walkA(60, kid) },
          { t: 0.25, ...walkB(95, kid) },
          { t: 0.5, ...crouch(140, kid) },
          { t: 0.75, ...armsUp(140, kid) },
        ],
      },
    ],
  },
  juego_social: {
    duration: 3000,
    still: 0.25,
    bg: 'sun',
    elements: [
      {
        kind: 'rect',
        w: 10,
        h: 10,
        r: 2,
        fill: 'cream',
        stroke: 'ink',
        frames: [
          { t: 0, x: 100, y: 100, rot: 0 },
          { t: 0.5, x: 100, y: 80, rot: 180 },
        ],
      },
      {
        kind: 'figure',
        color: 'coral',
        frames: [
          { t: 0, ...stand(65, adult), ra: [70, 80] },
          { t: 0.5, ...armsUp(65, adult) },
        ],
      },
      {
        kind: 'figure',
        color: 'sky',
        scale: kid,
        frames: [
          { t: 0, ...armsUp(135, kid) },
          { t: 0.5, ...stand(135, kid), la: [-70, -80] },
        ],
      },
    ],
  },
  autonomia: {
    duration: 3200,
    still: 0.3,
    bg: 'mint',
    elements: [
      { kind: 'rect', w: 40, h: 4, r: 2, fill: 'wood', frames: [{ t: 0, x: 120, y: 98 }] },
      {
        kind: 'circle',
        r: 5,
        fill: 'coral',
        frames: [
          { t: 0, x: 105, y: 92 },
          { t: 0.5, x: 128, y: 92 },
        ],
      },
      {
        kind: 'figure',
        color: 'mint',
        scale: kid,
        frames: [
          { t: 0, ...holdFront(92, kid) },
          { t: 0.5, ...holdFront(98, kid), ra: [70, 90] },
        ],
      },
    ],
  },
  creatividad: {
    duration: 3000,
    still: 0.4,
    bg: 'sun',
    elements: [
      {
        kind: 'path',
        d: 'M0 0 C 10 -10, 20 10, 30 0',
        fill: 'none',
        stroke: 'violet',
        sw: 3,
        frames: [
          { t: 0, x: 110, y: 60, s: 0.4, o: 0.3 },
          { t: 0.5, x: 110, y: 60, s: 1, o: 1 },
        ],
      },
      {
        kind: 'figure',
        color: 'violet',
        scale: kid,
        frames: [
          { t: 0, ...stand(90, kid), ra: [110, 120] },
          { t: 0.5, ...stand(90, kid), ra: [130, 100] },
        ],
      },
    ],
  },
};
