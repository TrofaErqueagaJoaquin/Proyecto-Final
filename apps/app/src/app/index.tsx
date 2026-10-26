import { HealthResponseSchema, type HealthResponse } from '@crecer/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { publicEnv } from '@/lib/env';

type ApiStatus =
  { state: 'loading' } | { state: 'ok'; health: HealthResponse } | { state: 'error' };

// Pantalla provisoria de la Fase 1: confirma que la app, el paquete compartido y la API
// se comunican. Se reemplaza por el inicio público en la Fase 5.
export default function Index() {
  const [status, setStatus] = useState<ApiStatus>({ state: 'loading' });
  const dark = useColorScheme() === 'dark';

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${publicEnv.EXPO_PUBLIC_API_URL}/v1/health`, { signal: controller.signal })
      .then(async (res) => HealthResponseSchema.parse(await res.json()))
      .then((health) => {
        setStatus({ state: 'ok', health });
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ state: 'error' });
      });
    return () => {
      controller.abort();
    };
  }, []);

  const ink = dark ? '#ECEFEA' : '#1F2A2E';
  const muted = dark ? '#A7B3AE' : '#55656A';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: dark ? '#121816' : '#FBF7F1' }]}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: ink }]}>
          Crecer en Casa
        </Text>
        <Text style={[styles.body, { color: muted }]}>
          Orientación familiar sobre desarrollo infantil y uso de pantallas.
        </Text>
        <Text accessibilityLiveRegion="polite" style={[styles.status, { color: muted }]}>
          {status.state === 'loading' && 'Conectando con la API…'}
          {status.state === 'ok' &&
            `API conectada · entorno ${status.health.env} · v${status.health.version}`}
          {status.state === 'error' && 'No se pudo conectar con la API.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 640 },
  title: { fontSize: 39, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  status: { fontSize: 14 },
});
