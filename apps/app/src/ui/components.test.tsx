import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { TextField } from './TextField';

describe('Button', () => {
  it('es accesible como botón y responde al toque', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Guardar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado: lo anuncia y no responde', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Guardar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('cargando: anuncia ocupado y evita dobles envíos', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Guardar" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('muestra el error como alerta', async () => {
    await renderWithProviders(<TextField label="Correo" error="Revisá el correo" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Revisá el correo');
  });

  it('permite mostrar y ocultar la contraseña', async () => {
    await renderWithProviders(<TextField label="Contraseña" secureTextEntry />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeOnTheScreen();
  });
});

describe('Checkbox', () => {
  it('cambia de estado y lo anuncia', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<Checkbox checked={false} onChange={onChange} label="Acepto" />);
    const box = screen.getByRole('checkbox', { name: 'Acepto' });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
