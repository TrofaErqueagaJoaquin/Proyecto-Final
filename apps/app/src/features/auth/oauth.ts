import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { rememberInvitation, withNext } from './pendingInvitation';
import { authRedirectUrl } from './redirect';

export type OAuthProvider = 'google' | 'github' | 'discord';

WebBrowser.maybeCompleteAuthSession();

/**
 * Ingreso con Google, GitHub o Discord (PKCE).
 * - Web: Supabase redirige el navegador y vuelve a /callback, que sigue a `next` (por ejemplo, una
 *   invitación a una familia).
 * - Nativo: se abre el navegador del sistema y el deep link vuelve con el código. `next` no viaja
 *   en el deep link (el navegador compara la dirección de vuelta tal cual): la pantalla que llamó
 *   sigue a `next` cuando se abre la sesión, y la invitación queda guardada como respaldo.
 */
export async function signInWithProvider(provider: OAuthProvider, next?: string): Promise<void> {
  await rememberInvitation(next);

  if (Platform.OS === 'web') {
    const redirectTo = authRedirectUrl(withNext('/callback', next));
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return;
  }

  const redirectTo = authRedirectUrl('/callback');
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
