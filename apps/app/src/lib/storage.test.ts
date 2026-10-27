import * as SecureStore from 'expo-secure-store';

import { storage } from './storage';

// En jest-expo la plataforma por defecto es nativa: se usa SecureStore (mock en memoria).
const memory = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => {
  memory.clear();
});

describe('storage (nativo)', () => {
  it('guarda y recupera valores largos partidos en fragmentos', async () => {
    const value = 'x'.repeat(5000);
    await storage.setItem('sb-proyecto-auth-token', value);
    expect(memory.get('sb-proyecto-auth-token.n')).toBe('3');
    await expect(storage.getItem('sb-proyecto-auth-token')).resolves.toBe(value);
  });

  it('al sobrescribir con un valor más corto no quedan fragmentos viejos', async () => {
    await storage.setItem('clave', 'y'.repeat(4000));
    await storage.setItem('clave', 'corto');
    expect(memory.has('clave.2')).toBe(false);
    await expect(storage.getItem('clave')).resolves.toBe('corto');
  });

  it('removeItem borra todos los fragmentos', async () => {
    await storage.setItem('clave', 'z'.repeat(4000));
    await storage.removeItem('clave');
    expect(memory.size).toBe(0);
    await expect(storage.getItem('clave')).resolves.toBeNull();
  });

  it('normaliza claves con caracteres que SecureStore no admite', async () => {
    await storage.setItem('crecer:tema', 'dark');
    expect(memory.has('crecer_tema.0')).toBe(true);
    await expect(storage.getItem('crecer:tema')).resolves.toBe('dark');
  });

  it('un valor incompleto se trata como ausente', async () => {
    await storage.setItem('clave', 'w'.repeat(4000));
    memory.delete('clave.1');
    await expect(storage.getItem('clave')).resolves.toBeNull();
  });
});
