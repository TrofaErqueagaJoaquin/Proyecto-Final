import { router, type Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { Button } from '@/ui';

/**
 * "Volver": vuelve a la pantalla anterior y, si no hay historial (se entró por un enlace o
 * se recargó la página), va a `fallback`. Nunca saca de la app.
 */
export function BackButton({ fallback }: { fallback: Href }) {
  return (
    <Button
      label="Volver"
      variant="ghost"
      icon={ArrowLeft}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback);
      }}
    />
  );
}
