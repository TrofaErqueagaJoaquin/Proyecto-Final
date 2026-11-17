import { act, renderHook } from '@testing-library/react-native';

import { useFieldErrors } from './useFieldErrors';

describe('useFieldErrors', () => {
  it('no muestra errores hasta salir del campo', async () => {
    const { result } = await renderHook(() => useFieldErrors({ name: 'Falta', city: undefined }));
    expect(result.current.shown('name')).toBeUndefined();
    await act(() => {
      result.current.touch('name')();
    });
    expect(result.current.shown('name')).toBe('Falta');
  });

  it('al guardar muestra todos los errores y frena', async () => {
    const { result } = await renderHook(() => useFieldErrors({ name: 'Falta' }));
    let canSave = true;
    await act(() => {
      canSave = result.current.attempt();
    });
    expect(canSave).toBe(false);
    expect(result.current.shown('name')).toBe('Falta');
  });

  it('sin errores deja guardar, y reset vuelve a empezar', async () => {
    const { result } = await renderHook(() => useFieldErrors({ name: undefined }));
    let canSave = false;
    await act(() => {
      canSave = result.current.attempt();
    });
    expect(canSave).toBe(true);
    await act(() => {
      result.current.reset();
    });
    expect(result.current.attempted).toBe(false);
  });

  it('el error se va apenas se corrige', async () => {
    const { result, rerender } = await renderHook(
      ({ errors }: { errors: { name: string | undefined } }) => useFieldErrors(errors),
      { initialProps: { errors: { name: 'Falta' } } },
    );
    await act(() => {
      result.current.touch('name')();
    });
    expect(result.current.shown('name')).toBe('Falta');
    await rerender({ errors: { name: undefined } });
    expect(result.current.shown('name')).toBeUndefined();
  });

  it('al guardar lleva el foco al primer campo con error', async () => {
    const { result } = await renderHook(() =>
      useFieldErrors({ name: undefined, email: 'Revisá el correo', city: 'Falta' }),
    );
    const name = { focus: jest.fn() };
    const email = { focus: jest.fn() };
    const city = { focus: jest.fn() };
    result.current.field('name').ref(name as never);
    result.current.field('email').ref(email as never);
    result.current.field('city').ref(city as never);
    await act(() => {
      result.current.attempt();
    });
    expect(email.focus).toHaveBeenCalledTimes(1);
    expect(name.focus).not.toHaveBeenCalled();
    expect(city.focus).not.toHaveBeenCalled();
  });

  it('Enter pasa al campo siguiente y el último envía', async () => {
    const onSubmit = jest.fn();
    const { result } = await renderHook(() =>
      useFieldErrors({ name: undefined, email: undefined }, { onSubmit }),
    );
    const email = { focus: jest.fn() };
    result.current.field('email').ref(email as never);
    expect(result.current.field('name').returnKeyType).toBe('next');
    expect(result.current.field('email').returnKeyType).toBe('done');
    result.current.field('name').onSubmitEditing();
    expect(email.focus).toHaveBeenCalledTimes(1);
    result.current.field('email').onSubmitEditing();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
