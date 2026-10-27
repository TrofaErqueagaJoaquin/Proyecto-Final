import { defineConfig, globalIgnores } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig(
  // Global: un objeto con `ignores` y otras claves solo ignora para ese objeto.
  globalIgnores(['dist/**', '.expo/**', 'expo-env.d.ts']),
  expoConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
