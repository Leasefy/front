/**
 * La pantalla de mantenimientos cierra una solicitud CON las fotos del trabajo
 * (Nico, 02-10-2026: «Subir fotos del trabajo» al cerrar).
 *
 * De punta a punta por la página: el detalle real (`MantenimientoViewer`) y su
 * diálogo real de cierre; sólo la red es un doble (`mantenimientoApi.subirFoto`
 * y `.completar`). Ninguna subida real a Storage.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Props = Record<string, unknown>;

const h = vi.hoisted(() => {
  const SOL = {
    id: 'sol-9',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    type: 'plumbing',
    priority: 'medium',
    status: 'in_progress',
    title: 'Gotera en el baño',
    description: 'El sifón del lavamanos gotea',
    photoUrls: [] as string[],
    quotes: [] as unknown[],
    paidBy: 'owner',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
  };
  return {
    SOL,
    canAccess: vi.fn((_m: string, _a: string) => true),
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
    refetch: vi.fn(async () => [] as unknown[]),
    red: { subirFoto: vi.fn(), completar: vi.fn() },
    paginaApi: { create: vi.fn(), approveQuote: vi.fn(), updateStatus: vi.fn(), addQuote: vi.fn(), subirFoto: vi.fn() },
  };
});

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: (d: string) => d }),
}));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess, isLoading: false }),
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useMantenimientos: () => ({ mantenimientos: [h.SOL], isLoading: false, errorCrudo: null, refetch: h.refetch }),
  useConsignaciones: () => ({ consignaciones: [], isLoading: false, errorCrudo: null, refetch: vi.fn(async () => []) }),
  mantenimientoApi: h.paginaApi,
}));
// La red del diálogo de cierre: dobles.
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  mantenimientoApi: { subirFoto: h.red.subirFoto, completar: h.red.completar },
}));
// El detalle es el REAL; el tablero sólo abre el detalle de la solicitud.
vi.mock('@/components/inmobiliaria', async () => {
  const { MantenimientoViewer } = await vi.importActual<
    typeof import('@/components/inmobiliaria/MantenimientoViewer')
  >('@/components/inmobiliaria/MantenimientoViewer');
  return {
    MantenimientoViewer,
    MantenimientoKanban: (p: Props) => (
      <button type="button" data-testid="abrir-detalle" onClick={() => (p.onViewDetails as (s: unknown) => void)(h.SOL)} />
    ),
    MantenimientoList: () => null,
    MantenimientoForm: () => null,
    AgregarCotizacionDialog: () => null,
  };
});

import MantenimientosPage from './page';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  h.canAccess.mockImplementation(() => true);
  h.red.subirFoto.mockImplementation(async (_id: string, f: File) => ({ ruta: `agencia/sol-9/${f.name}`, photoUrls: [] }));
  h.red.completar.mockImplementation(async (id: string, cierre: object) => ({ ...h.SOL, id, status: 'completed', ...cierre }));
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
  URL.revokeObjectURL = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const $ = <T extends Element>(sel: string) => document.body.querySelector(sel) as T | null;

async function abrirElCierre() {
  await act(async () => {
    root.render(<MantenimientosPage />);
  });
  await act(async () => {
    $<HTMLButtonElement>('[data-testid="abrir-detalle"]')!.click();
  });
  const marcar = Array.from(document.body.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('inmobiliaria.mantenimiento.markCompleted'),
  ) as HTMLButtonElement | undefined;
  expect(marcar, 'el detalle ofrece «Marcar como completada»').toBeDefined();
  await act(async () => marcar!.click());
}

describe('Mantenimientos — cerrar con las fotos del trabajo', () => {
  it('🔴 la página cierra con las fotos subidas de verdad (dobles), recarga, avisa y cierra el detalle', async () => {
    await abrirElCierre();
    expect($('[data-testid="completar-solicitud"]')?.textContent).toContain('Subir fotos del trabajo');

    const input = $<HTMLInputElement>('[data-testid="fotos-del-trabajo-input"]')!;
    const fotos = [
      new File([new Uint8Array(10)], 'tubo-nuevo.jpg', { type: 'image/jpeg' }),
      new File([new Uint8Array(10)], 'sin-gotera.webp', { type: 'image/webp' }),
    ];
    Object.defineProperty(input, 'files', { configurable: true, value: fotos });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      $<HTMLButtonElement>('[data-testid="completar-confirmar"]')!.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(h.red.subirFoto).toHaveBeenCalledTimes(2);
    // Las del trabajo, no las del reporte: `destino: 'trabajo'`.
    expect(h.red.subirFoto.mock.calls.map((c) => c[2])).toEqual(['trabajo', 'trabajo']);
    expect(h.red.completar).toHaveBeenCalledWith('sol-9', {
      completionPhotoUrls: ['agencia/sol-9/tubo-nuevo.jpg', 'agencia/sol-9/sin-gotera.webp'],
    });
    // Lo de después de cualquier cierre, y sin el cambio de estado sin fotos.
    expect(h.refetch).toHaveBeenCalled();
    expect(h.toast.success).toHaveBeenCalledWith('inmobiliaria.operaciones.toasts.statusUpdated');
    expect(h.paginaApi.updateStatus).not.toHaveBeenCalled();
    expect($('[data-testid="completar-solicitud"]')).toBeNull();
  });

  it('sin permiso de editar no hay cierre con fotos', async () => {
    h.canAccess.mockImplementation((_m: string, a: string) => a !== 'edit');
    await act(async () => {
      root.render(<MantenimientosPage />);
    });
    await act(async () => {
      $<HTMLButtonElement>('[data-testid="abrir-detalle"]')?.click();
    });
    expect($('[data-testid="completar-solicitud"]')).toBeNull();
    expect($('[data-testid="fotos-del-trabajo-input"]')).toBeNull();
  });
});
