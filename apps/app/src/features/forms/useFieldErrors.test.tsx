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
});
