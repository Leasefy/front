/**
 * Solicitudes del inquilino (glow up 22-10): lo que espera respuesta va primero y la línea del encabezado lo dice;
 * el estado con su punto y su palabra; el fallo con el encabezado común y un reintento que vuelve a pedir.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estado = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  error: null as string | null,
  refetch: vi.fn(async () => undefined),
}));

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({ isComplete: true, isLoading: false }),
}));
vi.mock('@/lib/hooks/use-tenant-pqrs', () => ({
  useTenantPqrs: () => ({
    items: estado.items,
    isLoading: false,
    error: estado.error,
    disponible: true,
    contratos: [],
    refetch: estado.refetch,
  }),
}));
vi.mock('@/components/tenant/NuevaSolicitudModal', () => ({ NuevaSolicitudModal: () => null }));
vi.mock('@/components/tenant/CompleteProfileFirst', () => ({ CompleteProfileFirst: () => null }));

import SolicitudesPage from './page';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  estado.items = [];
  estado.error = null;
  estado.refetch.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const solicitud = (id: string, estadoDeLaSolicitud: string, extra: Record<string, unknown> = {}) => ({
  id,
  tipo: 'reparacion',
  asunto: `Asunto ${id}`,
  estado: estadoDeLaSolicitud,
  radicado: null,
  createdAt: '2026-10-15T15:00:00.000Z',
  updatedAt: '2026-10-16T15:00:00.000Z',
  slaVenceAt: '2026-10-30T15:00:00.000Z',
  ...extra,
});

describe('Solicitudes del inquilino', () => {
  it('la abierta va primero y el encabezado dice cuántas esperan respuesta', () => {
    estado.items = [
      solicitud('cerrada', 'cerrada', { resueltaAt: '2026-10-10T15:00:00.000Z' }),
      solicitud('abierta', 'recibida'),
    ];
    act(() => root.render(<SolicitudesPage />));
    const enlaces = Array.from(host.querySelectorAll('a[href^="/inquilino/casos/"]')).map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual(['/inquilino/casos/abierta', '/inquilino/casos/cerrada']);
    expect(host.textContent).toContain('Tienes 1 solicitud abierta: va primero');
  });

  it('si no cargan: el encabezado común y «Reintentar» vuelve a pedir, sin recargar la ruta', () => {
    estado.error = 'No pudimos leer tus solicitudes.';
    act(() => root.render(<SolicitudesPage />));
    expect(host.querySelector('h1')?.textContent).toContain('Solicitudes');
    const reintentar = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'));
    expect(reintentar).toBeTruthy();
    act(() => reintentar!.click());
    expect(estado.refetch).toHaveBeenCalledTimes(1);
  });
});
