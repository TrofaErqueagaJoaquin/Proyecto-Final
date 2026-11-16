import { useSyncExternalStore } from 'react';

import { storage } from '@/lib/storage';

/**
 * Sonidos y vibraciones de la app (rediseño de 2026): refuerzan los momentos lindos (una actividad
 * hecha, un logro) sin interrumpir. Se apagan desde Perfil y nunca rompen nada: si el dispositivo o
 * el navegador no los soporta, simplemente no suenan.
 */

export type FeedbackKind = 'tap' | 'done' | 'achievement' | 'bell';

interface Settings {
  sound: boolean;
  vibration: boolean;
}

const STORAGE_KEY = 'crecer.feedback';
let settings: Settings = { sound: true, vibration: true };
const listeners = new Set<() => void>();
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw) settings = { ...settings, ...(JSON.parse(raw) as Partial<Settings>) };
    emit();
  } catch {
    // Sin almacenamiento (modo privado): quedan los valores por defecto.
  }
}

export function setFeedbackSettings(next: Partial<Settings>) {
  settings = { ...settings, ...next };
  emit();
  storage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => undefined);
}

/** Preferencias de sonido y vibración, para los interruptores de Perfil. */
export function useFeedbackSettings(): Settings {
  void load();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => settings,
    () => settings,
  );
}

const SOUNDS = {
  tap: require('../../../assets/sounds/toque.wav') as number,
  done: require('../../../assets/sounds/hecho.wav') as number,
  achievement: require('../../../assets/sounds/logro.wav') as number,
  bell: require('../../../assets/sounds/campana.wav') as number,
} satisfies Record<FeedbackKind, number>;

type Player = { seekTo: (seconds: number) => unknown; play: () => void };
const players = new Map<FeedbackKind, Player>();

async function playSound(kind: FeedbackKind) {
  try {
    let player = players.get(kind);
    if (!player) {
      const audio = await import('expo-audio');
      if (players.size === 0) {
        await audio.setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'mixWithOthers',
        });
      }
      player = audio.createAudioPlayer(SOUNDS[kind]);
      players.set(kind, player);
    }
    await player.seekTo(0);
    player.play();
  } catch {
    // Sin audio disponible: se sigue sin sonido.
  }
}

async function vibrate(kind: FeedbackKind) {
  try {
    const haptics = await import('expo-haptics');
    if (kind === 'tap') await haptics.selectionAsync();
    else if (kind === 'bell') await haptics.impactAsync(haptics.ImpactFeedbackStyle.Soft);
    else await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
  } catch {
    // Sin vibración disponible.
  }
}

/** Sonido y vibración para un momento de la app, según las preferencias. */
export function feedback(kind: FeedbackKind) {
  void load().then(() => {
    if (settings.sound && kind !== 'tap') void playSound(kind);
    if (settings.vibration) void vibrate(kind);
  });
}
