import { CURRENT_POLICY_VERSION } from '@crecer/shared';
import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

import { ErrorState, Screen, Skeleton } from '@/ui';

import { useAuth } from './AuthProvider';
import { useAcceptTerms, useTermsConsent } from './queries';

/** Ruta actual con sus parámetros (por ejemplo, el token de una invitación). */
function useCurrentUrl(): string {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value);
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function Loading() {
  return (
    <Screen>
      <Skeleton height={32} width="60%" />
      <Skeleton height={120} />
      <Skeleton height={120} />
    </Screen>
  );
}

/**
 * Guarda de las rutas privadas: exige sesión y la aceptación vigente de términos y privacidad.
 * Es solo experiencia de uso; la protección real de los datos está en RLS y en la API.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const currentUrl = useCurrentUrl();
  const terms = useTermsConsent();
  const accept = useAcceptTerms();

  const acceptedAtSignUp =
    auth.status === 'signedIn' &&
    auth.session.user.user_metadata.terms_version === CURRENT_POLICY_VERSION;
  const shouldAutoAccept = terms.data?.accepted === false && acceptedAtSignUp && accept.isIdle;

  useEffect(() => {
    if (shouldAutoAccept) accept.mutate();
  }, [shouldAutoAccept, accept]);

  if (auth.status === 'loading') return <Loading />;
  if (auth.status === 'signedOut') {
    return <Redirect href={`/ingresar?next=${encodeURIComponent(currentUrl)}`} />;
  }
  if (terms.isPending || shouldAutoAccept || accept.isPending) return <Loading />;
  if (terms.isError) return <ErrorState onRetry={() => void terms.refetch()} />;
  if (!terms.data.accepted) {
    if (acceptedAtSignUp && accept.isError) {
      return (
        <ErrorState
          onRetry={() => {
            accept.reset();
          }}
        />
      );
    }
    return <Redirect href={`/bienvenida?next=${encodeURIComponent(currentUrl)}`} />;
  }
  return children;
}
