/**
 * Anular una factura emitida: lo que esta prueba protege es la DECISIÓN DE
 * NEGOCIO (Nico, 2026-09-15), no el dibujo.
 *
 * · Una factura que se puede anular ofrece el botón.
 * · Una que NO se puede (sin número de la DIAN, o ya anulada) muestra la razón
 *   en vez del botón: un botón que va a fallar es peor que no tenerlo.
 * · Sin la migración aplicada, la pantalla lo dice y no ofrece nada.
 * · El motivo es obligatorio de verdad: menos de diez caracteres no anula.
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

import { FacturasEmitidas, motivoSuficiente } from './FacturasEmitidas';

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

describe('FacturasEmitidas', () => {
  it('una factura con número de la DIAN ofrece anularla con nota crédito', async () => {
    await pintar({ mes: '2026-09', anulacionDisponible: true, facturas: [factura()] });
    expect(q('[data-testid="anular-3"]')).not.toBeNull();
    expect(q('[data-testid="sin-anular-3"]')).toBeNull();
  });

  it('🔴 sin número de la DIAN no hay botón: hay explicación', async () => {
    await pintar({
      mes: '2026-09',
      anulacionDisponible: true,
      facturas: [
        factura({
          numeroDian: null,
          anulacion: {
            puede: false,
            bloqueo: 'SIN_NUMERO_DIAN',
            explicacion: 'Esta factura se emitió sin número autorizado por la DIAN.',
          },
        }),
      ],
    });
    expect(q('[data-testid="anular-3"]')).toBeNull();
    expect(q('[data-testid="sin-anular-3"]')!.textContent).toContain(
      'sin número autorizado',
    );
  });

  it('🔴 una factura ya anulada dice con cuál nota, y no se vuelve a anular', async () => {
    await pintar({
      mes: '2026-09',
      anulacionDisponible: true,
      facturas: [
        factura({
          notaCredito: {
            id: 'nc-1',
            numero: 'NC-12',
            concepto: 'ANULACION',
            motivo: 'el contrato se terminó el 3',
            valorCop: 1_800_000,
            notaContable: 'Neteada en el libro: el asiento N.º 8 reversa la causación N.º 7.',
            createdAt: '2026-09-15T12:00:00.000Z',
          },
          anulacion: {
            puede: false,
            bloqueo: 'YA_ANULADA',
            explicacion: 'Esta factura ya se anuló con la nota crédito NC-12.',
          },
        }),
      ],
    });
    expect(q('[data-testid="anular-3"]')).toBeNull();
    expect(q('[data-testid="sin-anular-3"]')!.textContent).toContain('NC-12');
  });

  it('🔴 sin la migración aplicada lo dice, en vez de ofrecer un botón que va a fallar', async () => {
    await pintar({
      mes: '2026-09',
      anulacionDisponible: false,
      facturas: [
        factura({
          anulacion: {
            puede: false,
            bloqueo: 'MIGRACION_PENDIENTE',
            explicacion: 'Anular con nota crédito llega con la migración.',
          },
        }),
      ],
    });
    expect(q('[data-testid="anulacion-no-disponible"]')).not.toBeNull();
    expect(q('[data-testid="anular-3"]')).toBeNull();
  });

  it('el fallo de carga no se lee como «no hay facturas»', async () => {
    emitidas.mockRejectedValue(new Error('500'));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<FacturasEmitidas mes="2026-09" vista="ventas" />);
    });
    expect(host.textContent ?? '').not.toContain('Todavía no emitiste');
  });

  it('🔴 el motivo es obligatorio de verdad: menos de diez caracteres no alcanza', () => {
    expect(motivoSuficiente('   ')).toBe(false);
    expect(motivoSuficiente('error')).toBe(false);
    expect(motivoSuficiente('se facturó de más')).toBe(true);
  });
});
