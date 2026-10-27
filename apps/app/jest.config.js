/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // La condición "react-native" resuelve a un .mjs que Jest no ejecuta: se usa la versión CJS.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // Con pnpm, los paquetes viven en node_modules/.pnpm/<pkg>/node_modules/<pkg>: se permite
  // `.pnpm` en el primer tramo y se transforman los paquetes de React Native y Expo.
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm|(jest-)?react-native|@react-native|expo|@expo|@expo-google-fonts|@react-navigation|lucide-react-native|react-native-svg|@supabase|@tanstack|@crecer)',
  ],
};
