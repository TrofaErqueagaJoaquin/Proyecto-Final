import type { Question } from '@crecer/domain';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { CheckQuestion } from './CheckQuestion';

jest.mock('@/features/feedback/feedback', () => ({ feedback: jest.fn() }));
// Reanimated necesita el runtime nativo de worklets: para estas pruebas alcanza una vista común.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const animation = { duration: () => animation };
  return { __esModule: true, default: { View }, FadeInRight: animation };
});

const single: Question = {
  id: 'q1',
  code: 'pantalla_noche',
  prompt: '¿Usa pantallas antes de dormir?',
  type: 'single',
  required: true,
  options: [
    { id: 'o1', code: 'casi_nunca', label: 'Casi nunca', value: 0 },
    { id: 'o2', code: 'a_veces', label: 'A veces', value: 1 },
  ],
};

const hours: Question = {
  id: 'q2',
  code: 'horas_sueno',
  prompt: '¿Cuántas horas duerme?',
  type: 'number',
  required: true,
  options: [],
  number: { min: 6, max: 14, step: 1, unit: 'horas' },
};

describe('CheckQuestion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('una opción responde y avanza sola', async () => {
    const onAnswer = jest.fn();
    const onNext = jest.fn();
    await renderWithProviders(
      <CheckQuestion question={single} rows={[]} onAnswer={onAnswer} onNext={onNext} />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Casi nunca' }));
    expect(onAnswer).toHaveBeenCalledWith({ questionId: 'q1', optionIds: ['o1'], value: null });
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('dos toques rápidos avanzan una sola vez (no saltean una pregunta)', async () => {
    const onNext = jest.fn();
    await renderWithProviders(
      <CheckQuestion question={single} rows={[]} onAnswer={jest.fn()} onNext={onNext} />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Casi nunca' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'A veces' }));
    await act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('los números arrancan en "—" y el primer toque muestra un valor del medio', async () => {
    const onAnswer = jest.fn();
    const onNext = jest.fn();
    await renderWithProviders(
      <CheckQuestion question={hours} rows={[]} onAnswer={onAnswer} onNext={onNext} />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText('Falta esta: tocá − o +.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Más' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Más' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onAnswer).toHaveBeenCalledWith({ questionId: 'q2', optionIds: [], value: 11 });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('"Siguiente" sin responder una obligatoria marca "Falta esta"', async () => {
    const onNext = jest.fn();
    await renderWithProviders(
      <CheckQuestion question={single} rows={[]} onAnswer={jest.fn()} onNext={onNext} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText('Falta esta: elegí una.')).toBeTruthy();
  });

  it('una opcional se puede saltear', async () => {
    const onNext = jest.fn();
    await renderWithProviders(
      <CheckQuestion
        question={{ ...single, required: false }}
        rows={[]}
        onAnswer={jest.fn()}
        onNext={onNext}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
