import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig(expoConfig, {
  ignores: ['dist/**', '.expo/**', 'expo-env.d.ts'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
});
