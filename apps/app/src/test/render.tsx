import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/ui';
import { OverlayQueueProvider } from '@/ui/OverlayQueue';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <OverlayQueueProvider>{children}</OverlayQueueProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Render con los providers de la app (tema, áreas seguras y turnos de las ventanas). En RNTL 14 es asíncrono. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}
