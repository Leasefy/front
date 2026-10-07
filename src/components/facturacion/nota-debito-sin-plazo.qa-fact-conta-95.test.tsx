/**
 * 🔴 QA-FACT-CONTA-95 r2 (05-10-2026, FA-B-06; main con la recomendada, CR-31 de
 * Nico): sin días de plazo fijados no corre interés de mora y el back frena la
 * nota débito de «Intereses de mora» (409). El diálogo «Cobrar de más» ya no la
 * ofrece cuando `emitidas` dice `plazoSinFijar`, y dice por qué.
 *
 * (Arnés copiado de CorregirFactura.test.tsx.)
 * Corregir una factura emitida: nota crédito PARCIAL y nota DÉBITO.
 *
 * Lo que protege esta prueba es la regla de negocio del 17-09, no el dibujo:
 *
 *  · los botones SÓLO aparecen cuando el back dice que se puede; cuando no, se
 *    muestra la razón — un botón que va a fallar es peor que no tenerlo;
 *  · el tope de la parcial está a la vista ANTES de escribir, y un valor que se
 *    pasa no deja emitir;
 *  · el motivo es obligatorio de verdad (10 caracteres), igual que en la
 *    anulación total;
 *  · lo ya acreditado y el saldo se ven en la fila.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { emitirNotaCreditoParcial, emitirNotaDebito } = vi.hoisted(() => ({
  emitirNotaCreditoParcial: vi.fn(),
  emitirNotaDebito: vi.fn(),
}));

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real =
    await vi.importActual<
      typeof import('@/lib/api/facturacion-electronica.service')
    >('@/lib/api/facturacion-electronica.service');
  return {
    ...real,
    facturacionElectronicaService: {
      emitirNotaCreditoParcial,
      emitirNotaDebito,
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { CorregirFactura, conceptosDeLaNotaDebito } from './CorregirFactura';
import type { FacturaEmitida } from '@/lib/api/facturacion-por-mes.service';

function factura(correccion: Record<string, unknown> = {}): FacturaEmitida {
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
    baseCop: 1_000_000,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 1_000_000,
    netoCop: 1_000_000,
    createdAt: '2026-09-01T12:00:00.000Z',
    notaCredito: null,
    notasCredito: [],
    anulacion: { puede: true, bloqueo: null, explicacion: null },
    correccion: {
      saldoCop: 1_000_000,
      acreditadoCop: 0,
      puedeAnular: true,
      puedeParcial: true,
      maximoParcialCop: 1_000_000,
      puedeNotaDebito: true,
      bloqueo: null,
      explicacion: null,
      ...correccion,
    },
  } as unknown as FacturaEmitida;
}

let host: HTMLDivElement;
let root: Root;
const onHecho = vi.fn();

function pintar(f: FacturaEmitida, plazoSinFijar?: boolean) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<CorregirFactura factura={f} onHecho={onHecho} plazoSinFijar={plazoSinFijar} />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

/** El diálogo de Radix se monta en `document.body`, no dentro del host. */
const q = (s: string) =>
  host.querySelector(s) ?? document.body.querySelector(s);

async function escribir(sel: string, valor: string) {
  const el = q(sel) as HTMLInputElement | HTMLTextAreaElement;
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('FA-B-06 · sin plazo fijado no se ofrecen los intereses de mora', () => {
  it('🔴 la lista de conceptos no trae «Intereses de mora» sin plazo; con plazo, sí', () => {
    expect(conceptosDeLaNotaDebito(true)).not.toContain('INTERESES_DE_MORA');
    expect(conceptosDeLaNotaDebito(true).length).toBeGreaterThan(0);
    expect(conceptosDeLaNotaDebito(false)).toContain('INTERESES_DE_MORA');
  });

  it('🔴 «Cobrar de más» arranca en otro concepto, dice por qué y manda ese concepto', async () => {
    pintar(factura(), true);
    await act(async () => {
      (q('[data-testid="nota-debito-3"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="corregir-concepto"]')?.textContent).not.toMatch(/Intereses de mora/);
    expect(q('[data-testid="corregir-sin-plazo-sin-intereses"]')?.textContent).toMatch(
      /Sin días de plazo fijados no corre interés de mora/,
    );
    await escribir('[data-testid="corregir-valor"]', '25000');
    await escribir('[data-testid="corregir-motivo"]', 'gastos de cobranza pactados del mes');
    emitirNotaDebito.mockResolvedValue({ numeroInterno: 'ND-7' });
    await act(async () => {
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).click();
    });
    const enviado = emitirNotaDebito.mock.calls[0]?.[1] as { concepto: string };
    expect(enviado.concepto).not.toBe('INTERESES_DE_MORA');
  });

  it('con el plazo fijado sigue como antes: arranca en «Intereses de mora», sin el aviso', async () => {
    pintar(factura(), false);
    await act(async () => {
      (q('[data-testid="nota-debito-3"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="corregir-concepto"]')?.textContent).toMatch(/Intereses de mora/);
    expect(q('[data-testid="corregir-sin-plazo-sin-intereses"]')).toBeNull();
  });
});
