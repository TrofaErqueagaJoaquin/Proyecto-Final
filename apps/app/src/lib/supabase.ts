import type { Database } from '@crecer/shared';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { publicEnv } from './env';
import { storage } from './storage';

/**
 * Cliente de Supabase de la app. Solo tiene la clave publicable: todo lo que lee o escribe
 * pasa por RLS con el JWT de la persona (ADR-006).
 */
export const supabase = createClient<Database>(
  publicEnv.EXPO_PUBLIC_SUPABASE_URL,
  publicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      // Los retornos de OAuth y de los correos se procesan en la ruta /callback.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

// En nativo, la renovación automática del token solo corre con la app en primer plano.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
