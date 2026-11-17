import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/render';

import { Button } from './Button';
import { ConfirmAction } from './Choice';
import { EmptyState } from './Feedback';
import { Sheet } from './Sheet';
import { StepNav } from './StepNav';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('StepNav', () => {
  it('"Atrás" va primero y el principal después', async () => {
    const onBack = jest.fn();
    const onNext = jest.fn();
    await renderWithProviders(<StepNav onBack={onBack} onNext={onNext} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.props.accessibilityLabel as string)).toEqual([
      'Atrás',
      'Siguiente',
    ]);
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Atrás' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('en el primer paso solo muestra el principal', async () => {
    await renderWithProviders(<StepNav onNext={jest.fn()} nextLabel="Empezar" />);
    expect(screen.queryByRole('button', { name: 'Atrás' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeOnTheScreen();
  });
});

describe('ConfirmAction', () => {
  it('pide confirmar en una ventana y recién ahí actúa', async () => {
    const onConfirm = jest.fn();
    await renderWithProviders(
      <ConfirmAction
        label="Borrar"
        confirmLabel="Sí, borrar"
        description="No se puede deshacer."
        onConfirm={onConfirm}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Sí, borrar' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar' }));
    expect(screen.getByText('¿Borrar?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sí, borrar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('"Cancelar" cierra sin hacer nada', async () => {
    const onConfirm = jest.fn();
    await renderWithProviders(
      <ConfirmAction
        label="Revocar"
        confirmLabel="Sí, revocar"
        description="x"
        onConfirm={onConfirm}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Revocar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Sí, revocar' })).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('adentro de un Sheet pregunta en el mismo lugar, sin abrir otra ventana', async () => {
    const onConfirm = jest.fn();
    await renderWithProviders(
      <Sheet visible onClose={jest.fn()} title="Objetivo">
        <ConfirmAction
          label="Dejar de lado"
          confirmLabel="Sí, dejar de lado"
          description="Pasa a la lista de cerrados."
          onConfirm={onConfirm}
        />
      </Sheet>,
    );
    const closers = screen.getAllByRole('button', { name: 'Cerrar' }).length;
    await fireEvent.press(screen.getByRole('button', { name: 'Dejar de lado' }));
    // El botón se reemplaza por la pregunta: no queda el disparador ni hay un segundo "Cerrar".
    expect(screen.queryByRole('button', { name: 'Dejar de lado' })).toBeNull();
    expect(screen.getByText('¿Dejar de lado?')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Cerrar' })).toHaveLength(closers);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Dejar de lado' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Dejar de lado' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sí, dejar de lado' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Objetivo')).toBeOnTheScreen();
  });
});

describe('Button con savedKey', () => {
  it('muestra "Guardado" 2 s y vuelve al texto de siempre', async () => {
    jest.useFakeTimers();
    try {
      const { rerender } = await renderWithProviders(<Button label="Guardar" savedKey={0} />);
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeOnTheScreen();
      await rerender(<Button label="Guardar" savedKey={1} />);
      expect(screen.getByRole('button', { name: 'Guardado' })).toBeOnTheScreen();
      await act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('EmptyState', () => {
  it('acepta una ilustración en lugar del ícono', async () => {
    await renderWithProviders(
      <EmptyState illustration={<Text>Brote</Text>} title="Todavía no hay plan" />,
    );
    expect(screen.getByText('Brote')).toBeOnTheScreen();
    expect(screen.getByText('Todavía no hay plan')).toBeOnTheScreen();
  });
});
