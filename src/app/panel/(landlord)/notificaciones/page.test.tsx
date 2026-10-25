/**
 * GLOW UP (21-10-2026): las notificaciones del propietario con el encabezado
 * común del portal (el mismo de las del inquilino): título, cuántas sin leer y
 * las acciones arriba, que a 390 px bajan de renglón sin correr la página.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { datos } = vi.hoisted(() => ({ datos: { unreadCount: 2 } }));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/landlord/ContratosConLaInmobiliaria', () => ({
  useContratosAdministrados: () => ({ doc: null, cargando: false }),
}));
vi.mock('@/lib/hooks/useNotifications', () => ({
  useLandlordNotifications: () => ({
    notifications: [],
    unreadCount: datos.unreadCount,
    isLoading: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  }),
}));

import NotificacionesDelPropietario from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<NotificacionesDelPropietario />);
  });
}

describe('Notificaciones del propietario', () => {
  it('el encabezado común con «Marcar todo como leído» y la configuración arriba', async () => {
    await montar();
    const encabezado = document.querySelector('header');
    expect(encabezado?.querySelector('h1')?.textContent).toBeTruthy();
    const botones = Array.from(encabezado?.querySelectorAll('button') ?? []);
    expect(botones.some((b) => b.getAttribute('aria-label') === 'Configuración')).toBe(true);
    expect(botones.length).toBe(2);
  });

  it('sin nada sin leer no ofrece marcar todo', async () => {
    datos.unreadCount = 0;
    await montar();
    const botones = Array.from(document.querySelector('header')?.querySelectorAll('button') ?? []);
    expect(botones.length).toBe(1);
  });
});
