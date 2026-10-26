import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export const ignores = {
  ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**', '**/.expo/**', '**/node_modules/**'],
};

/**
 * Configuración estricta con chequeo de tipos para paquetes TypeScript de Node o puros.
 * @param {string} tsconfigRootDir directorio del paquete (import.meta.dirname)
 */
export function typescriptConfig(tsconfigRootDir) {
  return defineConfig(
    ignores,
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      extends: [tseslint.configs.disableTypeChecked],
    },
  );
}

// packages/shared y packages/domain se ejecutan igual en la app y en la API:
// no pueden depender de UI, de un framework de servidor ni de Supabase.
export const pureLibraryBoundaries = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              'react',
              'react-*',
              'react-native',
              'react-native-*',
              'expo',
              'expo-*',
              'hono',
              'hono/*',
              '@supabase/*',
            ],
            message:
              'packages/shared y packages/domain son TypeScript puro: no pueden depender de UI, servidor ni Supabase.',
          },
        ],
      },
    ],
  },
};
