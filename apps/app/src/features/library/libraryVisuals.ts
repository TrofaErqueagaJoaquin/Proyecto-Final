import {
  Baby,
  Backpack,
  Ban,
  Bike,
  BookOpen,
  CloudRain,
  Handshake,
  Headphones,
  Lightbulb,
  Moon,
  Mountain,
  PowerOff,
  Puzzle,
  Shapes,
  Smartphone,
  Sprout,
  ToyBrick,
  Users,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';

import type { Tone } from './activityVisuals';

/** Dibujo de una tarjeta de la biblioteca: ícono y tono de color (claro u oscuro según el tema). */
export interface Visual {
  icon: LucideIcon;
  tone: Tone;
}

/** Un ícono por etapa (`AGE_STAGES`): bebé, juguete, mochila, bici y auriculares. */
const STAGE_VISUALS: Record<string, Visual> = {
  'etapa-0-2': { icon: Baby, tone: 'info' },
  'etapa-3-5': { icon: ToyBrick, tone: 'caution' },
  'etapa-6-8': { icon: Backpack, tone: 'success' },
  'etapa-9-11': { icon: Bike, tone: 'primary' },
  'etapa-12-17': { icon: Headphones, tone: 'accent' },
};

export function stageVisual(slug: string): Visual {
  return STAGE_VISUALS[slug] ?? { icon: Sprout, tone: 'success' };
}

/** Las fichas de situación que hay hoy en `content/library`. */
const SITUATION_VISUALS: Record<string, Visual> = {
  'ficha-a-bebe-videos': { icon: Baby, tone: 'info' },
  'ficha-b-pantalla-para-calmarse': { icon: Wind, tone: 'success' },
  'ficha-c-reaccion-al-apagar': { icon: PowerOff, tone: 'caution' },
  'ficha-d-pocas-actividades': { icon: Shapes, tone: 'primary' },
  'ficha-e-evita-esfuerzo': { icon: Mountain, tone: 'success' },
  'ficha-f-abandona-actividades': { icon: CloudRain, tone: 'info' },
  'ficha-g-conflictos-familiares': { icon: Handshake, tone: 'accent' },
  'ficha-h-adolescente-uso-interfiere': { icon: Smartphone, tone: 'caution' },
  'ficha-i-castigos-y-prohibiciones': { icon: Ban, tone: 'accent' },
};

// Las fichas nuevas se cargan desde el panel con cualquier slug: se elige el ícono por palabras
// del slug o del título y, si no hay ninguna conocida, va la lamparita.
const KEYWORD_VISUALS: [RegExp, Visual][] = [
  [/sue[ñn]o|dorm|noche/, { icon: Moon, tone: 'info' }],
  [/pantalla|celular|video|tablet|redes/, { icon: Smartphone, tone: 'caution' }],
  [/calma|enoj|rabiet|berrinch|llor/, { icon: Wind, tone: 'success' }],
  [/famil|herman/, { icon: Users, tone: 'accent' }],
  [/escuel|colegio|tarea|lectur|leer/, { icon: BookOpen, tone: 'primary' }],
  [/juego|jugar|aburr/, { icon: Puzzle, tone: 'primary' }],
];

export const FALLBACK_VISUAL: Visual = { icon: Lightbulb, tone: 'primary' };

export function situationVisual(slug: string, title = ''): Visual {
  const known = SITUATION_VISUALS[slug];
  if (known) return known;
  const text = `${slug} ${title}`.toLowerCase();
  return KEYWORD_VISUALS.find(([pattern]) => pattern.test(text))?.[1] ?? FALLBACK_VISUAL;
}

/** "Ficha B · Necesita la pantalla para calmarse" → "Necesita la pantalla para calmarse". */
export function shortTitle(title: string): string {
  const short = title.replace(/^Ficha\s+[A-Z0-9]{1,3}\s*[·:.\-–—]\s*/u, '').trim();
  return short === '' ? title : short;
}
