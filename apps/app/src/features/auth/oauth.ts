import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { authRedirectUrl } from './redirect';

export type OAuthProvider = 'google' | 'github';

WebBrowser.maybeCompleteAuthSession();

/**
 * Ingreso con Google o GitHub (PKCE).
 * - Web: Supabase redirige el navegador y vuelve a /callback.
 * - Nativo: se abre el navegador del sistema y el deep link vuelve con el código.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<void> {
  const redirectTo = authRedirectUrl('/callback');

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // la persona cerró el navegador

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('El proveedor no devolvió un código de acceso.');
  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) throw exchange.error;
}
