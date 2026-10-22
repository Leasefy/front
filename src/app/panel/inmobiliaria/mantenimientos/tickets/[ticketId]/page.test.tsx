/**
 * La ficha del ticket siempre tiene salida (glow up, 21-10-2026): el «no está»
 * y el fallo traían un vacío con el texto de la BANDEJA y una alerta, los dos
 * sin forma de volver a la lista.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { estado } = vi.hoisted(() => ({
  estado: { data: null as unknown, isLoading: false, error: null as string | null },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({
  useParams: () => ({ ticketId: 't-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/mantenimientos/tickets/t-1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/hooks/mantenimiento/use-mantenimiento-ticket', () => ({
  useMantenimientoTicket: () => estado,
}));
vi.mock('@/components/inmobiliaria/mantenimiento/TicketDetail', () => ({
  TicketDetail: () => <div data-testid="detalle-del-ticket" />,
}));

import MantenimientoTicketDetailPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<MantenimientoTicketDetailPage />);
  });
}

const enlacesALaLista = () =>
  Array.from(document.querySelectorAll('a')).filter(
    (a) => a.getAttribute('href') === '/panel/inmobiliaria/mantenimientos/tickets',
  );

beforeEach(() => {
  estado.data = null;
  estado.isLoading = false;
  estado.error = null;
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('La ficha del ticket', () => {
  it('un ticket que no está lo dice como ticket (no como bandeja vacía) y deja volver a la lista', async () => {
    await montar();
    expect(document.body.textContent).toContain('No encontramos esta solicitud');
    expect(enlacesALaLista()).toHaveLength(1);
  });

  it('el fallo también deja volver a la lista', async () => {
    estado.error = 'se cayó';
    await montar();
    expect(document.body.textContent).toContain('Error al cargar el detalle');
    expect(enlacesALaLista()).toHaveLength(1);
  });

  it('con el ticket, la vuelta va arriba del detalle', async () => {
    estado.data = { id: 't-1' };
    await montar();
    expect(document.querySelector('[data-testid="detalle-del-ticket"]')).not.toBeNull();
    expect(enlacesALaLista()).toHaveLength(1);
  });
});
