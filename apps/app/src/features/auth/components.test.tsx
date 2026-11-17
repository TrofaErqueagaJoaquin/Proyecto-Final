import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { ActionLink, useCooldown } from './components';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
// Brote usa Reanimated, que no carga en Jest; acá no hace falta.
jest.mock('@/features/brote/Brote', () => ({ BroteSays: () => null }));
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ActionLink', () => {
  it('es un botón accesible que responde al toque', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<ActionLink onPress={onPress}>No soy yo · Cerrar sesión</ActionLink>);
    await fireEvent.press(screen.getByRole('button', { name: 'No soy yo · Cerrar sesión' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado: lo anuncia y no responde', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <ActionLink onPress={onPress} disabled>
        Reenviar
      </ActionLink>,
    );
    const link = screen.getByRole('button', { name: 'Reenviar' });
    expect(link).toBeDisabled();
    await fireEvent.press(link);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('useCooldown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('cuenta hacia atrás desde que arranca hasta 0', async () => {
    const { result } = await renderHook(() => useCooldown(3));
    expect(result.current.left).toBe(0);
    await act(() => {
      result.current.start();
    });
    expect(result.current.left).toBe(3);
    for (let i = 0; i < 3; i += 1) {
      await act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(result.current.left).toBe(0);
  });
});
