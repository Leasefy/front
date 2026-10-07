/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026, FA3-09): Ventas dice cómo quedó cada factura
 * ante la DIAN, y a una RECHAZADA no le ofrece anular ni corregir con nota
 * crédito (la DIAN rechazaría la nota también): dice qué hacer.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// `vi.mock` se iza al tope del archivo, así que las funciones del doble no
// pueden ser variables de módulo: viven en `vi.hoisted`.
const { emitidas, emitirNotaCredito } = vi.hoisted(() => ({
  emitidas: vi.fn(),
  emitirNotaCredito: vi.fn(),
}));

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-por-mes.service')>(
    '@/lib/api/facturacion-por-mes.service',
  );
  return {
    ...real,
    facturacionPorMesService: { emitidas, emitirNotaCredito },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { FacturasEmitidas } from './FacturasEmitidas';

function factura(over: Record<string, unknown> = {}) {
  return {
    id: 'f-1',
    numero: 3,
    numeroDian: 'FE-1042',
    destinatario: 'INQUILINO',
    terceroNombre: 'Nubia Amparo David',
    terceroDocumento: '43123456',
    inmueble: 'Apartamento 302',
    contractId: 'ct-1',
    mes: '2026-09',
    baseCop: 1_800_000,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 1_800_000,
    netoCop: 1_800_000,
    createdAt: '2026-09-01T12:00:00.000Z',
    notaCredito: null,
    anulacion: { puede: true, bloqueo: null, explicacion: null },
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function pintar(respuesta: Record<string, unknown>) {
  emitidas.mockResolvedValue(respuesta);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<FacturasEmitidas mes="2026-09" vista="ventas" />);
  });
}

beforeEach(() => {
  emitidas.mockReset();
  emitirNotaCredito.mockReset();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

const q = (s: string) => host.querySelector(s);

const RECHAZADA = 'La DIAN rechazó esta factura: no es un documento válido y una nota crédito no puede corregirla (la DIAN la rechazaría también). Corrige lo que dijo la DIAN y vuelve a transmitirla desde «Electrónica».';

describe('QA-FACT-CONTA-95 · Ventas y el estado ante la DIAN (FA3-09)', () => {
  it('🔴 cada factura dice cómo quedó ante la DIAN', async () => {
    await pintar({
      mes: '2026-09',
      anulacionDisponible: true,
      facturas: [
        factura({ transmision: { estado: 'ACEPTADA_DIAN', nombre: 'Validada por la DIAN' } }),
        factura({
          id: 'f-4',
          numero: 4,
          numeroDian: 'FE-1043',
          transmision: { estado: 'POR_TRANSMITIR', nombre: 'En cola' },
        }),
      ],
    });
    expect(q('[data-testid="ventas-dian-3"]')?.textContent).toBe('Validada por la DIAN');
    expect(q('[data-testid="ventas-dian-4"]')?.textContent).toBe('En cola');
  });

  it('🔴 una RECHAZADA no ofrece anular ni corregir: dice que se corrige y se retransmite', async () => {
    await pintar({
      mes: '2026-09',
      anulacionDisponible: true,
      facturas: [
        factura({
          transmision: { estado: 'RECHAZADA_DIAN', nombre: 'Rechazada por la DIAN' },
          anulacion: { puede: false, bloqueo: 'RECHAZADA_POR_LA_DIAN', explicacion: RECHAZADA },
          correccion: {
            saldoCop: 1_800_000,
            acreditadoCop: 0,
            puedeAnular: false,
            puedeParcial: false,
            maximoParcialCop: 0,
            puedeNotaDebito: false,
            bloqueo: 'RECHAZADA_POR_LA_DIAN',
            explicacion: RECHAZADA,
          },
        }),
      ],
    });
    expect(q('[data-testid="ventas-dian-3"]')?.textContent).toBe('Rechazada por la DIAN');
    expect(q('[data-testid="anular-3"]')).toBeNull();
    expect(q('[data-testid="sin-anular-3"]')?.textContent).toContain('vuelve a transmitirla');
    // La frase una sola vez (sin la de «corregir»).
    expect(host.textContent?.split('vuelve a transmitirla').length).toBe(2);
  });

  it('sin el dato (back anterior) no se dice nada', async () => {
    await pintar({ mes: '2026-09', anulacionDisponible: true, facturas: [factura()] });
    expect(q('[data-testid="ventas-dian-3"]')).toBeNull();
  });
});
