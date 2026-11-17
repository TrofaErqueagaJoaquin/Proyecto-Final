import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { SignOutButton, signOutWasRequested } from './signOut';

const mockSignOut = jest.fn((_options: { scope: string }) => Promise.resolve({ error: null }));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: (options: { scope: string }) => mockSignOut(options) } },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

function renderButton() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <SignOutButton />
    </QueryClientProvider>,
  );
}

describe('SignOutButton', () => {
  it('pide confirmación y se puede cancelar sin salir', async () => {
    await renderButton();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByText('¿Cerrar sesión?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(signOutWasRequested()).toBe(false);
  });

  it('al confirmar cierra la sesión y deja marcado que fue a pedido (portada con aviso)', async () => {
    await renderButton();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sí, salir' }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    });
    expect(signOutWasRequested()).toBe(true);
    expect(signOutWasRequested(Date.now() + 60_000)).toBe(false);
  });
});
