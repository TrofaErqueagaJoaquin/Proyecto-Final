/* global jest */

// Variables públicas ficticias para los tests (nunca se conectan a un servicio real).
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://proyecto-test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8787';

// SecureStore en memoria: el módulo nativo no existe en Jest.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    getItemAsync: jest.fn((key) => Promise.resolve(store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});
