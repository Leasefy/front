/**
 * 🔴 D12 (Nico y Juan Camilo, 17-09-2026): «las reparaciones a cargo del
 * propietario SIEMPRE las aprueba el propietario, con excepción de
 * EMERGENCIA». Visto desde el panel de la inmobiliaria y desde el portal del
 * propietario.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import type { AprobacionDeReparacion, AprobacionEnElPortal } from '@/lib/types/deducciones';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

const api = vi.hoisted(() => ({
  delPortal: vi.fn(),
  aprobar: vi.fn(),
  rechazar: vi.fn(),
  soporte: vi.fn(),
  bandeja: vi.fn(),
  registrarEmergencia: vi.fn(),
}));
vi.mock('@/lib/api/aprobaciones-de-reparacion.service', () => ({
  aprobacionesDeReparacionApi: api,
}));
vi.mock('@leasefy/cadence', async (original) => ({
  ...(await original<object>()),
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PropuestaYCargoDeLaReparacion } from './PropuestaYCargoDeLaReparacion';
import { ACargoDeDialog } from './ACargoDeDialog';
import AprobarReparacionesPage from '@/app/panel/(landlord)/aprobaciones/page';

const BASE: AprobacionDeReparacion = {
  id: 'ap-1',
  solicitudId: 'sol-1',
  quoteId: 'q-1',
  consignacionId: 'cons-1',
  propietarioId: 'own-1',
  valorCop: 180_000,
  motivo: 'Gotera · Plomería Rápida',
  estado: 'PENDIENTE',
  emergencia: false,
  motivoDeEmergencia: null,
  soporteNombre: null,
  aviso: null,
  pedidaAt: '2026-09-17T10:00:00.000Z',
  decididaAt: null,
  motivoDeRechazo: null,
  anuladaAt: null,
  motivoDeAnulacion: null,
};

function solicitud(overrides: Partial<SolicitudMantenimiento> = {}): SolicitudMantenimiento {
  return {
    id: 'sol-1',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'own-1',
    tenantId: 'ten-1',
    propertyTitle: 'Apto 402',
    propertyAddress: 'Cra 76',
    tenantName: 'Camila',
    propietarioName: 'Ana Dueña',
    type: 'plumbing',
    priority: 'medium',
    status: 'quoted',
    title: 'Gotera',
    description: 'Gotea',
    photoUrls: [],
    quotes: [],
    paidBy: 'owner',
    selectedQuoteId: 'q-1',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  } as SolicitudMantenimiento;
}

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  Object.values(api).forEach((f) => f.mockReset());
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

const q = (testid: string) => document.body.querySelector(`[data-testid="${testid}"]`);

describe('en el panel: dónde está la aprobación del propietario', () => {
  it('pendiente: dice que espera al propietario', async () => {
    await act(async () => {
      raiz.render(<PropuestaYCargoDeLaReparacion solicitud={solicitud({ aprobacionDelPropietario: BASE })} />);
    });
    expect(q('aprobacion-del-propietario-PENDIENTE')?.textContent).toContain(
      'Esperando la aprobación del propietario',
    );
  });

  it('RECHAZADA: se ve el motivo y la inmobiliaria decide qué sigue', async () => {
    const onRevisar = vi.fn();
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({
            aprobacionDelPropietario: {
              ...BASE,
              estado: 'RECHAZADA',
              decididaAt: '2026-09-17T12:00:00.000Z',
              motivoDeRechazo: 'Lo dañó el inquilino',
            },
          })}
          onRevisar={onRevisar}
        />,
      );
    });
    expect(q('aprobacion-motivo-de-rechazo')?.textContent).toContain('Lo dañó el inquilino');
    await act(async () => {
      (q('aprobacion-decidir') as HTMLButtonElement).click();
    });
    expect(onRevisar).toHaveBeenCalledWith('sol-1', 'q-1');
  });

  it('EMERGENCIA: se ve el aviso que se le generó al propietario', async () => {
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({
            aprobacionDelPropietario: {
              ...BASE,
              estado: 'EMERGENCIA',
              emergencia: true,
              aviso: { asunto: 'Reparación de emergencia en Apto 402', cuerpo: 'Hola Ana: …', generadoAt: '2026-09-17T12:00:00.000Z' },
            },
          })}
        />,
      );
    });
    expect(q('aprobacion-aviso')?.textContent).toContain('Reparación de emergencia en Apto 402');
  });

  it('una anulada no se pinta', async () => {
    await act(async () => {
      raiz.render(
        <PropuestaYCargoDeLaReparacion
          solicitud={solicitud({ aprobacionDelPropietario: { ...BASE, estado: 'ANULADA' } })}
        />,
      );
    });
    expect(contenedor.innerHTML).toBe('');
  });
});

describe('<ACargoDeDialog> — la excepción de emergencia', () => {
  it('a cargo del propietario se PIDE la aprobación; por emergencia exige motivo y soporte y los manda', async () => {
    const onConfirmar = vi.fn(() => Promise.resolve());
    await act(async () => {
      raiz.render(
        <ACargoDeDialog
          abierto
          onOpenChange={vi.fn()}
          cotizacion={{ proveedor: 'Plomería Rápida', valorCop: 180_000 }}
          onConfirmar={onConfirmar}
        />,
      );
    });
    await act(async () => {
      (q('a-cargo-de-PROPIETARIO') as HTMLButtonElement).click();
    });
    expect(q('a-cargo-de-confirmar')?.textContent).toContain('Pedir aprobación al propietario');

    await act(async () => {
      (q('emergencia-marcar') as HTMLInputElement).click();
    });
    expect((q('a-cargo-de-confirmar') as HTMLButtonElement).disabled).toBe(true);

    const textarea = q('emergencia-motivo') as HTMLTextAreaElement;
    const archivo = new File(['%PDF'], 'factura.pdf', { type: 'application/pdf' });
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(textarea, 'Fuga de gas');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      const input = q('emergencia-soporte') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [archivo] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect((q('a-cargo-de-confirmar') as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      (q('a-cargo-de-confirmar') as HTMLButtonElement).click();
    });
    expect(onConfirmar).toHaveBeenCalledWith('PROPIETARIO', { motivo: 'Fuga de gas', soporte: archivo });
  });
});

describe('en el portal del propietario: «Aprobar reparaciones»', () => {
  const PENDIENTE: AprobacionEnElPortal = {
    ...BASE,
    inmobiliaria: 'Portofino',
    inmueble: 'Apto 402',
    reparacion: { titulo: 'Gotera en el baño', descripcion: 'El sifón gotea' },
    cotizacion: { proveedor: 'Plomería Rápida', descripcion: 'Cambio de sifón', diasEstimados: 1 },
  };

  it('ve la reparación con la cotización y la aprueba con un clic', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] });
    api.aprobar.mockResolvedValue({ ...BASE, estado: 'APROBADA', deduccionIds: ['d1'] });
    await act(async () => {
      raiz.render(<AprobarReparacionesPage />);
    });
    const tarjeta = q('aprobacion-pendiente')?.textContent ?? '';
    expect(tarjeta).toContain('Gotera en el baño');
    expect(tarjeta).toContain('Plomería Rápida');
    expect(tarjeta).toMatch(/180\.?000/);

    api.delPortal.mockResolvedValue({ pendientes: [], historial: [{ ...PENDIENTE, estado: 'APROBADA' }] });
    await act(async () => {
      (q('aprobacion-aprobar') as HTMLButtonElement).click();
    });
    expect(api.aprobar).toHaveBeenCalledWith('ap-1');
    expect(q('aprobacion-historial-APROBADA')).not.toBeNull();
  });

  it('la rechaza con un motivo opcional', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] });
    api.rechazar.mockResolvedValue({ ...BASE, estado: 'RECHAZADA' });
    await act(async () => {
      raiz.render(<AprobarReparacionesPage />);
    });
    await act(async () => {
      (q('aprobacion-rechazar') as HTMLButtonElement).click();
    });
    await act(async () => {
      (q('aprobacion-confirmar-rechazo') as HTMLButtonElement).click();
    });
    expect(api.rechazar).toHaveBeenCalledWith('ap-1', '');
  });

  it('sin nada que aprobar lo dice', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [], historial: [] });
    await act(async () => {
      raiz.render(<AprobarReparacionesPage />);
    });
    expect(q('aprobaciones-vacio')).not.toBeNull();
  });
});
