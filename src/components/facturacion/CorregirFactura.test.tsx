/**
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

import { CorregirFactura, motivoSuficienteParaCorregir } from './CorregirFactura';
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

function pintar(f: FacturaEmitida) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<CorregirFactura factura={f} onHecho={onHecho} />);
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

describe('CorregirFactura', () => {
  it('motivoSuficienteParaCorregir es la misma regla del back (10 caracteres)', () => {
    expect(motivoSuficienteParaCorregir('corto')).toBe(false);
    expect(motivoSuficienteParaCorregir('   nueve  ')).toBe(false);
    expect(motivoSuficienteParaCorregir('se cobró de más')).toBe(true);
  });

  it('ofrece las dos correcciones cuando el back dice que se puede', () => {
    pintar(factura());
    expect(q('[data-testid="nota-parcial-3"]')).not.toBeNull();
    expect(q('[data-testid="nota-debito-3"]')).not.toBeNull();
  });

  it('🔴 con la factura ya anulada no hay botones: está la razón', () => {
    pintar(
      factura({
        puedeAnular: false,
        puedeParcial: false,
        puedeNotaDebito: false,
        bloqueo: 'YA_ANULADA',
        explicacion:
          'Esta factura ya se anuló por completo con la nota crédito NC-7.',
      }),
    );
    expect(q('[data-testid="nota-parcial-3"]')).toBeNull();
    expect(q('[data-testid="nota-debito-3"]')).toBeNull();
    expect(q('[data-testid="sin-corregir-3"]')!.textContent).toContain('NC-7');
  });

  it('muestra lo ya acreditado y el saldo cuando hay parciales encima', () => {
    pintar(
      factura({
        acreditadoCop: 400_000,
        saldoCop: 600_000,
        maximoParcialCop: 600_000,
        puedeAnular: false,
        explicacion: 'Esta factura ya tiene notas crédito parciales…',
      }),
    );
    const marca = q('[data-testid="acreditado-3"]')!;
    expect(marca.textContent).toContain('400.000');
    expect(marca.textContent).toContain('600.000');
  });

  it('🔴 el tope de la parcial está a la vista y un valor que se pasa no deja emitir', async () => {
    pintar(factura({ maximoParcialCop: 600_000, saldoCop: 600_000 }));
    await act(async () => {
      (q('[data-testid="nota-parcial-3"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="corregir-dialogo"]')!.textContent).toContain(
      '600.000',
    );

    await escribir('[data-testid="corregir-valor"]', '700000');
    await escribir(
      '[data-testid="corregir-motivo"]',
      'se cobró el parqueadero y el contrato no lo tiene',
    );
    expect(q('[data-testid="corregir-valor-error"]')).not.toBeNull();
    expect(
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).disabled,
    ).toBe(true);

    await escribir('[data-testid="corregir-valor"]', '600000');
    expect(q('[data-testid="corregir-valor-error"]')).toBeNull();
    emitirNotaCreditoParcial.mockResolvedValue({
      id: 'nc-1',
      numeroDeLaNota: 'NC-3',
      valorCop: 600_000,
    });
    await act(async () => {
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).click();
    });
    expect(emitirNotaCreditoParcial).toHaveBeenCalledWith('f-1', {
      concepto: 'REBAJA',
      motivo: 'se cobró el parqueadero y el contrato no lo tiene',
      valorCop: 600_000,
    });
    expect(onHecho).toHaveBeenCalled();
  });

  it('🔴 un motivo corto no emite nada', async () => {
    pintar(factura());
    await act(async () => {
      (q('[data-testid="nota-parcial-3"]') as HTMLButtonElement).click();
    });
    await escribir('[data-testid="corregir-valor"]', '100000');
    await escribir('[data-testid="corregir-motivo"]', 'error');
    expect(
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(emitirNotaCreditoParcial).not.toHaveBeenCalled();
  });

  it('la nota DÉBITO pide concepto y lo manda', async () => {
    pintar(factura());
    await act(async () => {
      (q('[data-testid="nota-debito-3"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="corregir-concepto"]')).not.toBeNull();
    await escribir('[data-testid="corregir-valor"]', '25000');
    await escribir(
      '[data-testid="corregir-motivo"]',
      'intereses de mora de septiembre',
    );
    emitirNotaDebito.mockResolvedValue({ numeroInterno: 'ND-1' });
    await act(async () => {
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).click();
    });
    expect(emitirNotaDebito).toHaveBeenCalledWith('f-1', {
      concepto: 'INTERESES_DE_MORA',
      motivo: 'intereses de mora de septiembre',
      valorCop: 25_000,
    });
  });
});
