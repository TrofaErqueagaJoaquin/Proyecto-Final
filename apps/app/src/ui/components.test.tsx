import { fireEvent, screen } from '@testing-library/react-native';

import { ApiError } from '@/lib/api';
import { renderWithProviders } from '@/test/render';

import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Banner, ErrorBanner, ErrorScreen, ErrorState, LoadingScreen } from './Feedback';
import { TextField } from './TextField';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

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

describe('Banner', () => {
  it('muestra un botón de acción cuando se lo pasan', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <Banner tone="danger" action={{ label: 'Reintentar', onPress }}>
        No pudimos guardar.
      </Banner>,
    );
    expect(screen.getByText('No pudimos guardar.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorBanner', () => {
  it('sin error no muestra nada', async () => {
    await renderWithProviders(<ErrorBanner error={null} onRetry={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sin internet: lo dice claro y ofrece reintentar', async () => {
    const onRetry = jest.fn();
    await renderWithProviders(
      <ErrorBanner error={new TypeError('Network request failed')} onRetry={onRetry} />,
    );
    expect(screen.getByText(/no hay internet/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('con la sesión vencida ofrece ingresar de nuevo', async () => {
    const onSignIn = jest.fn();
    await renderWithProviders(
      <ErrorBanner
        error={new ApiError(401, 'UNAUTHORIZED', 'x')}
        onRetry={jest.fn()}
        onSignIn={onSignIn}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Ingresar de nuevo' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorState', () => {
  it('sin props mantiene el texto de siempre', async () => {
    const onRetry = jest.fn();
    await renderWithProviders(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText('Algo salió mal')).toBeOnTheScreen();
    expect(screen.getByText('No pudimos cargar esta información.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('distingue la falta de conexión y suma una salida secundaria', async () => {
    const onExit = jest.fn();
    await renderWithProviders(
      <ErrorState
        error={new TypeError('Failed to fetch')}
        onRetry={jest.fn()}
        secondaryAction={{ label: 'Mi cuenta', onPress: onExit }}
      />,
    );
    expect(screen.getByText('Sin conexión')).toBeOnTheScreen();
    expect(screen.getByText(/no hay internet/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Mi cuenta' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe('Pantallas de carga y de error', () => {
  it('LoadingScreen muestra el mensaje y los esqueletos', async () => {
    await renderWithProviders(<LoadingScreen message="Buscando tu plan…" />);
    expect(screen.getByText('Buscando tu plan…')).toBeOnTheScreen();
    expect(screen.getAllByTestId('skeleton', { includeHiddenElements: true })).toHaveLength(3);
  });

  it('ErrorScreen envuelve el ErrorState', async () => {
    await renderWithProviders(<ErrorScreen onRetry={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
  });
});
