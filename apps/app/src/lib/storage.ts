import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Almacenamiento clave-valor para preferencias y sesión.
 * - Web: localStorage (la sesión queda protegida por la CSP; ADR-019).
 * - Nativo: SecureStore (Keychain/Keystore, cifrado). SecureStore limita el tamaño de cada valor,
 *   así que los valores largos (la sesión de Supabase) se guardan en partes.
 */
const CHUNK_SIZE = 1800;

function webStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

// SecureStore solo admite [A-Za-z0-9._-] en las claves.
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function nativeGet(key: string): Promise<string | null> {
  const base = safeKey(key);
  const count = await SecureStore.getItemAsync(`${base}.n`);
  if (count === null) return null;
  const parts: string[] = [];
  for (let i = 0; i < Number(count); i += 1) {
    const part = await SecureStore.getItemAsync(`${base}.${String(i)}`);
    if (part === null) return null; // valor corrupto: se trata como ausente
    parts.push(part);
  }
  return parts.join('');
}

async function nativeRemove(key: string): Promise<void> {
  const base = safeKey(key);
  const count = Number((await SecureStore.getItemAsync(`${base}.n`)) ?? 0);
  for (let i = 0; i < count; i += 1) {
    await SecureStore.deleteItemAsync(`${base}.${String(i)}`);
  }
  await SecureStore.deleteItemAsync(`${base}.n`);
}

async function nativeSet(key: string, value: string): Promise<void> {
  await nativeRemove(key);
  const base = safeKey(key);
  const parts = value.match(new RegExp(`[\\s\\S]{1,${String(CHUNK_SIZE)}}`, 'g')) ?? [''];
  for (const [i, part] of parts.entries()) {
    await SecureStore.setItemAsync(`${base}.${String(i)}`, part);
  }
  await SecureStore.setItemAsync(`${base}.n`, String(parts.length));
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStorage()?.getItem(key) ?? null;
    return nativeGet(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      webStorage()?.setItem(key, value);
      return;
    }
    await nativeSet(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      webStorage()?.removeItem(key);
      return;
    }
    await nativeRemove(key);
  },
};
