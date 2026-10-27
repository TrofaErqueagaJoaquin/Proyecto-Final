import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

type AuthState =
  | { status: 'loading'; session: null }
  | { status: 'signedOut'; session: null }
  | { status: 'signedIn'; session: Session };

const AuthContext = createContext<AuthState | null>(null);

/** Expone la sesión actual y reacciona a los cambios (ingreso, renovación, salida). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch(() => {
        setSession(null);
      });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // Al salir no debe quedar en memoria ningún dato de la persona anterior.
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    if (session === undefined) return { status: 'loading', session: null };
    if (session === null) return { status: 'signedOut', session: null };
    return { status: 'signedIn', session };
  }, [session]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
