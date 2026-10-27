import type { ExpoConfig } from 'expo/config';

// Identificadores provisorios: se confirman al registrar el nombre y el dominio (DECISIONS.md V-pendientes).
const BUNDLE_ID = 'ar.crecerencasa.app';

const config: ExpoConfig = {
  name: 'Crecer en Casa',
  slug: 'crecer-en-casa',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'crecerencasa',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#FBF7F1',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    // Web estática: la biblioteca pública se indexa en buscadores (TECH_STACK.md §2).
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FBF7F1',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    reactCompiler: true,
  },
};

export default config;
