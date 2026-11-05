import {
  Award,
  Flame,
  Footprints,
  Moon,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * Rachas y logros (rediseño de 2026). Se calculan con lo que ya está en la base: los días con
 * alguna actividad hecha y los chequeos terminados. Sin tablas nuevas y sin datos de los chicos.
 */

/** Días seguidos con al menos una actividad, contando hasta hoy (o hasta ayer, si hoy todavía no). */
export function currentStreak(doneDays: readonly string[], today: string): number {
  const days = new Set(doneDays);
  const cursor = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export interface Stats {
  activities: number;
  streak: number;
  bestStreak: number;
  checks: Set<string>;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  earned: boolean;
}

/** La racha más larga de la historia (para no "perder" un logro de racha al cortarla). */
export function bestStreak(doneDays: readonly string[]): number {
  const sorted = [...new Set(doneDays)].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of sorted) {
    const time = Date.parse(`${day}T12:00:00Z`);
    run = previous !== null && time - previous === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  }
  return best;
}

export function badges(stats: Stats): Badge[] {
  const themes = [...stats.checks].filter((slug) => slug.startsWith('tema-')).length;
  return [
    {
      id: 'chequeo',
      title: 'Primer paso',
      description: 'Hiciste el chequeo de 1 minuto',
      icon: Sparkles,
      earned: stats.checks.has('chequeo') || stats.checks.has('habitos'),
    },
    {
      id: 'primera',
      title: '¡A jugar!',
      description: 'Primera actividad hecha',
      icon: Star,
      earned: stats.activities >= 1,
    },
    {
      id: 'racha-3',
      title: 'Tres en línea',
      description: '3 días seguidos con actividades',
      icon: Flame,
      earned: stats.bestStreak >= 3,
    },
    {
      id: 'racha-7',
      title: 'Una semana entera',
      description: '7 días seguidos con actividades',
      icon: Award,
      earned: stats.bestStreak >= 7,
    },
    {
      id: 'diez',
      title: 'Diez momentos',
      description: '10 actividades hechas',
      icon: Footprints,
      earned: stats.activities >= 10,
    },
    {
      id: 'explorador',
      title: 'Conociéndonos',
      description: '3 chequeos de temas',
      icon: Moon,
      earned: themes >= 3,
    },
  ];
}
