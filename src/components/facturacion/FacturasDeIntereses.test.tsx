/**
 * 🔴 Q6 (QA-FACT, 03-10-2026): las facturas de intereses (nacen sin número cuando
 * un recibo paga intereses de un mes ya facturado) se ven y se emiten en «Por
 * facturar», con la resolución de «Otros». Antes no aparecían en ninguna pestaña.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { interesesPorEmitir, emitirIntereses, confirmarMock, toastOk, toastErr } = vi.hoisted(() => ({
  interesesPorEmitir: vi.fn(),
  emitirIntereses: vi.fn(),
  confirmarMock: vi.fn(),
  toastOk: vi.fn(),
  toastErr: vi.fn(),
}));

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-por-mes.service')>(
    '@/lib/api/facturacion-por-mes.service',
  );
  return { ...real, facturacionPorMesService: { interesesPorEmitir, emitirIntereses } };
});
vi.mock('@/components/ui/confirmar', () => ({ confirmar: (...a: unknown[]) => confirmarMock(...a) }));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: (...a: unknown[]) => toastOk(...a), error: (...a: unknown[]) => toastErr(...a) },
}));

import { FacturasDeIntereses } from './FacturasDeIntereses';

const RESOLUCION = {
  puedeNumerar: true,
  motivo: null,
  explicacion: null,
  numero: '18764000000001',
  prefijo: 'LABQA',
  desde: 1,
  hasta: 5000,
  vigenteHasta: '2027-09-01',
  disponibles: 4990,
  siguiente: 'LABQA-10',
};

function factura(id: string, total: number) {
  return {
    id,
    clave: `intereses|${id}`,
    contractId: 'ct-7',
    codigoDelContrato: 7,
    mes: '2026-08',
    terceroNombre: 'Carlos Arrendatario',
    terceroDocumento: '71000000',
    inmueble: 'Carrera 80 # 33-15 Apto 502',
    totalCop: total,
    lineas: [],
    generadaAt: '2026-10-03T15:00:00.000Z',
    pagada: true,
  };
}

let host: HTMLDivElement;
let root: Root;
const onEmitidas = vi.fn();

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<FacturasDeIntereses onEmitidas={onEmitidas} />);
  });
}
const q = (s: string) => host.querySelector(s);

beforeEach(() => {
  vi.clearAllMocks();
  confirmarMock.mockResolvedValue(true);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('FacturasDeIntereses (Q6)', () => {
  it('sin facturas de intereses (o un back sin la ruta) no pinta nada', async () => {
    interesesPorEmitir.mockRejectedValue(new Error('404'));
    await montar();
    expect(q('[data-testid="facturas-de-intereses"]')).toBeNull();
  });

  it('🔴 las lista y emite UNA con su confirmación y su número de «Otros»', async () => {
    interesesPorEmitir.mockResolvedValue({
      disponible: true,
      resolucion: RESOLUCION,
      facturas: [factura('fi-1', 41_000), factura('fi-2', 12_500)],
      explicacion: null,
    });
    emitirIntereses.mockResolvedValue({
      mes: '',
      emitidas: 1,
      yaEstaban: 0,
      sinNumero: 0,
      motivo: null,
      totalCop: 41_000,
      facturas: [],
    });
    await montar();
    const seccion = q('[data-testid="facturas-de-intereses"]')!;
    expect(seccion.textContent).toContain('Intereses pagados por facturar');
    expect(seccion.textContent).toContain('2 facturas · $\u00a053.500');
    expect(q('[data-testid="interes-fi-1"]')!.textContent).toContain('Intereses de agosto de 2026');

    await act(async () => {
      (q('[data-testid="interes-emitir-fi-1"]') as HTMLButtonElement).click();
    });
    expect((confirmarMock.mock.calls[0][0] as { titulo: string }).titulo).toBe(
      '¿Emitir la factura de intereses LABQA-10?',
    );
    expect(emitirIntereses).toHaveBeenCalledWith(['fi-1']);
    expect(toastOk).toHaveBeenCalledWith('1 factura de intereses emitida · $\u00a041.000');
    expect(onEmitidas).toHaveBeenCalled();
  });

  it('sin resolución de «Otros» no deja emitir y dice por qué, sin mandar a Facturación → Resolución', async () => {
    interesesPorEmitir.mockResolvedValue({
      disponible: true,
      resolucion: {
        ...RESOLUCION,
        puedeNumerar: false,
        siguiente: null,
        explicacion:
          'La inmobiliaria no tiene ninguna resolución de facturación que numere «Otros (intereses, reparaciones, estudios)». Cárgala en Facturación → Resolución, eligiendo ese tipo de documento (o una resolución sin tipo, que numera todo).',
      },
      facturas: [factura('fi-1', 41_000)],
      explicacion: null,
    });
    await montar();
    expect((q('[data-testid="intereses-emitir-todas"]') as HTMLButtonElement).disabled).toBe(true);
    const aviso = q('[data-testid="intereses-sin-resolucion"]')!.textContent!;
    expect(aviso).toContain('no tiene ninguna resolución');
    expect(aviso).not.toContain('Cárgala en Facturación');
  });

  it('si la persona no confirma, no se emite nada', async () => {
    confirmarMock.mockResolvedValue(false);
    interesesPorEmitir.mockResolvedValue({ disponible: true, resolucion: RESOLUCION, facturas: [factura('fi-1', 41_000)], explicacion: null });
    await montar();
    await act(async () => {
      (q('[data-testid="intereses-emitir-todas"]') as HTMLButtonElement).click();
    });
    expect(emitirIntereses).not.toHaveBeenCalled();
  });
});
