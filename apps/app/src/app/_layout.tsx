import '@/lib/polyfills';

import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { DemoBanner } from '@/features/demo/DemoBanner';
import { queryClient } from '@/lib/query';
import { ThemeProvider, useTheme } from '@/ui';

void SplashScreen.preventAutoHideAsync();

function ThemedNavigation() {
  const theme = useTheme();
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <NavigationTheme
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: theme.colors.bg,
          card: theme.colors.surface,
          text: theme.colors.ink,
          border: theme.colors.border,
          primary: theme.colors.primary,
        },
      }}
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}
      />
    </NavigationTheme>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_800ExtraBold,
    Nunito_700Bold,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Si las fuentes fallan se sigue con las del sistema: nunca se bloquea la app por tipografía.
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <DemoBanner />
            <ThemedNavigation />
          </View>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
