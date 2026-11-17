import { screen } from '@testing-library/react-native';
import { House, Users } from 'lucide-react-native';

import { renderWithProviders } from '@/test/render';
import { Text } from '@/ui';

import { AppShell, type NavItem } from './AppShell';

let mockPathname = '/familia/integrante/1';
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const ITEMS: NavItem[] = [
  { href: '/hoy', label: 'Hoy', icon: House },
  { href: '/familia', label: 'Familia', icon: Users },
];

// jest.spyOn no alcanza la exportación de react-native: se reemplaza el módulo del hook.
let mockScreenWidth = 390;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockScreenWidth, height: 800, scale: 2, fontScale: 1 }),
}));

function mockWidth(width: number) {
  mockScreenWidth = width;
}

describe('AppShell', () => {
  it('en el teléfono muestra pestañas y marca la sección actual (también en subrutas)', async () => {
    mockWidth(390);
    await renderWithProviders(
      <AppShell items={ITEMS}>
        <Text>contenido</Text>
      </AppShell>,
    );
    expect(screen.getByRole('tab', { name: 'Familia' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Hoy' })).not.toBeSelected();
    expect(screen.getByText('contenido')).toBeOnTheScreen();
  });

  it('una pantalla interna tiene la flecha "Volver"', async () => {
    mockWidth(390);
    mockPathname = '/familia/integrante/1';
    await renderWithProviders(
      <AppShell items={ITEMS}>
        <Text>contenido</Text>
      </AppShell>,
    );
    expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
  });

  it('la raíz del espacio no tiene "Volver"', async () => {
    mockWidth(390);
    mockPathname = '/hoy';
    await renderWithProviders(
      <AppShell items={ITEMS}>
        <Text>contenido</Text>
      </AppShell>,
    );
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Hoy' })).toBeSelected();
    mockPathname = '/familia/integrante/1';
  });

  it('en escritorio muestra la barra lateral con enlaces', async () => {
    mockWidth(1280);
    await renderWithProviders(
      <AppShell items={ITEMS}>
        <Text>contenido</Text>
      </AppShell>,
    );
    expect(screen.queryByRole('tab', { name: 'Hoy' })).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});
