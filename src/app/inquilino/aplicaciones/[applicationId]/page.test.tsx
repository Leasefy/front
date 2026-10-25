/**
 * La postulación del inquilino (glow up 22-10): los avisos en arena sin «¡!» (antes, bloques de color con borde
 * dentro de la tarjeta), los pasos en contorno y no en círculos de color rellenos, y el contrato por firmar con su
 * botón.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estado = vi.hoisted(() => ({
  application: null as Record<string, unknown> | null,
  contract: null as Record<string, unknown> | null,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ applicationId: 'a-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => `$ ${n}` }),
}));
vi.mock('@/lib/hooks/useApplications', () => ({
  useTenantApplication: () => ({
    application: estado.application,
    isLoading: false,
    error: null,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/lib/hooks/useContracts', () => ({
  useContractByApplication: () => ({ contract: estado.contract }),
}));
vi.mock('@/lib/tenant/historial-de-la-postulacion', () => ({
  historialDeLaPostulacion: () => [],
  historialMinimo: () => [],
  useHistorialDeLaPostulacion: () => ({ eventos: null }),
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
vi.mock('@/components/messages/ChatThread', () => ({ ChatThread: () => null }));
vi.mock('@/components/tenant/PedirDetalleDelRechazo', () => ({ PedirDetalleDelRechazo: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PostulacionPage from './page';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  estado.application = null;
  estado.contract = null;
});

const postulacion = (status: string) => ({
  id: 'a-1',
  status,
  submittedAt: '2026-10-10T15:00:00.000Z',
  property: { id: 'p-1', title: 'Apartamento en Laureles', monthlyRent: 2_000_000, city: 'Medellín', neighborhood: 'Laureles', images: [] },
});

describe('La postulación del inquilino', () => {
  it('aprobada con el contrato por firmar: el aviso en arena, sin «¡!», con su botón', () => {
    estado.application = postulacion('approved');
    estado.contract = { id: 'c-1', status: 'pending_tenant' };
    act(() => root.render(<PostulacionPage />));
    expect(host.textContent).toContain('Tu contrato está listo para firmar');
    expect(host.textContent).not.toContain('¡');
    expect(host.querySelector('a[href="/inquilino/contratos/c-1/firmar"]')).not.toBeNull();
    expect(host.querySelector('.bg-primary-soft.border')).toBeNull();
  });

  it('en proceso: los pasos en contorno, sin círculos de color rellenos', () => {
    estado.application = postulacion('under_review');
    act(() => root.render(<PostulacionPage />));
    expect(host.innerHTML).not.toContain('bg-primary text-white');
    expect(host.innerHTML).not.toContain('bg-success text-white');
  });
});
