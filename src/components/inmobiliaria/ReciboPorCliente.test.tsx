/**
 * ReciboPorCliente.test.tsx — elegir al cliente y ver su cartera.
 *
 * Las reglas puras primero (se pueden leer sin montar nada) y después el
 * combobox, que es el único paso que hace red por su cuenta.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CarteraDelCliente, CobroEnCartera } from '@/lib/api/recibos-de-caja.types';
import type { Inquilino } from '@/lib/api/inquilinos.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}));

const listar = vi.fn<[unknown], Promise<Inquilino[]>>();
vi.mock('@/lib/api/inquilinos.service', () => ({
  inquilinosApi: { listar: (f: unknown) => listar(f) },
}));

vi.mock('@/lib/api/recibos-de-caja.service', () => ({
  recibosDeCajaApi: { cartera: vi.fn(), carteraPorCobro: vi.fn() },
}));

import {
  ElegirCliente,
  clientesParaRecibo,
  conceptosDelPeriodo,
  etiquetaDeCliente,
  periodosSinConciliar,
} from './ReciboPorCliente';

function inquilino(tenantId: string, nombre: string, extra: Partial<Inquilino> = {}): Inquilino {
  return { tenantId, nombre, email: null, telefono: null, documento: null, arriendos: [], ...extra };
}

function periodo(id: string, extra: Partial<CobroEnCartera> = {}): CobroEnCartera {
  return {
    id,
    month: '2026-06',
    dueDate: '2026-06-05T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    consignacionId: 'cons1',
    contractId: null,
    leaseId: null,
    propertyTitle: 'Apto 101',
    tenantName: 'Jose',
    totalWithFees: 1_000_000,
    paidAmount: 0,
    pendingAmount: 1_000_000,
    status: 'PENDING',
    daysLate: 0,
    lateFee: 0,
    sinRespaldo: 0,
    conceptos: [],
    ...extra,
  };
}

describe('clientesParaRecibo', () => {
  it('ordena por nombre y NO esconde a quien ya no tiene arriendo', () => {
    const lista = [
      inquilino('b', 'Zulema'),
      // Sin arriendos: se fue, pero la deuda no se fue con ella.
      inquilino('a', 'Ana'),
    ];
    expect(clientesParaRecibo(lista).map((c) => c.nombre)).toEqual(['Ana', 'Zulema']);
  });

  it('no muta la lista que recibe', () => {
    const lista = [inquilino('b', 'Zulema'), inquilino('a', 'Ana')];
    clientesParaRecibo(lista);
    expect(lista.map((c) => c.nombre)).toEqual(['Zulema', 'Ana']);
  });
});

describe('etiquetaDeCliente', () => {
  it('junta nombre, documento y correo: el combobox filtra sólo por la etiqueta', () => {
    expect(
      etiquetaDeCliente(inquilino('a', 'Ana Pérez', { documento: '123', email: 'ana@x.co' })),
    ).toBe('Ana Pérez · 123 · ana@x.co');
  });

  it('sin documento ni correo es sólo el nombre, sin separadores sueltos', () => {
    expect(etiquetaDeCliente(inquilino('a', 'Ana Pérez'))).toBe('Ana Pérez');
  });
});

describe('conceptosDelPeriodo', () => {
  it('nombra lo que se le COBRA al inquilino y omite lo que resta', () => {
    const c = periodo('c1', {
      conceptos: [
        { id: '1', tipo: 'CANON', nombre: 'Canon', valorCop: 1_000_000, resta: false, reglaId: null, orden: 1 },
        // Un prorrateo RESTA: ponerlo al lado del canon hace pensar que se cobra.
        { id: '2', tipo: 'PRORRATEO', nombre: 'Prorrateo', valorCop: 200_000, resta: true, reglaId: null, orden: 2 },
      ],
    });
    expect(conceptosDelPeriodo(c)).toEqual(['Canon']);
  });

  it('sin motor de conceptos no inventa ninguno', () => {
    expect(conceptosDelPeriodo(periodo('c1'))).toEqual([]);
  });
});

describe('periodosSinConciliar', () => {
  const cartera: CarteraDelCliente = {
    tenantId: 't1',
    nombre: 'Jose',
    documento: null,
    email: null,
    inmuebles: 1,
    total: 2_000_000,
    cobros: [
      periodo('c-jun', { month: '2026-06', paidAmount: 400_000, sinRespaldo: 400_000 }),
      periodo('c-jul', { month: '2026-07' }),
    ],
  };

  it('sólo avisa de los períodos que ESTE pago va a tocar', () => {
    const plan = { partes: [{ id: 'c-jul', month: '2026-07', valorCop: 1, quedaPendiente: 0, aIntereses: 0, aCapital: 1 }], sobrante: 0, deudaTotal: 0, deudaRestante: 0 };
    expect(periodosSinConciliar(cartera, plan)).toEqual([]);
  });

  it('avisa cuando el pago cae sobre un período con plata sin recibo', () => {
    const plan = { partes: [{ id: 'c-jun', month: '2026-06', valorCop: 1, quedaPendiente: 0, aIntereses: 0, aCapital: 1 }], sobrante: 0, deudaTotal: 0, deudaRestante: 0 };
    expect(periodosSinConciliar(cartera, plan).map((c) => c.id)).toEqual(['c-jun']);
  });

  it('sin cartera no avisa nada', () => {
    expect(periodosSinConciliar(null, { partes: [], sobrante: 0, deudaTotal: 0, deudaRestante: 0 })).toEqual([]);
  });
});

describe('<ElegirCliente>', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
    listar.mockReset();
  });

  async function montar() {
    await act(async () => {
      root.render(<ElegirCliente value={null} onChange={vi.fn()} />);
    });
  }

  it('pide TODOS los inquilinos, también los de contrato terminado', async () => {
    listar.mockResolvedValue([inquilino('a', 'Ana')]);
    await montar();
    // La deuda no se termina cuando se termina el contrato.
    expect(listar).toHaveBeenCalledWith({ estado: 'todos' });
    expect(document.body.querySelector('[data-testid="cliente-recibo"]')).toBeTruthy();
  });

  it('sin inquilinos lo dice, en vez de un combobox vacío', async () => {
    listar.mockResolvedValue([]);
    await montar();
    expect(document.body.querySelector('[data-testid="sin-clientes"]')).toBeTruthy();
  });

  it('si la lista falla muestra el mensaje del back y deja reintentar', async () => {
    listar.mockRejectedValue(new Error('se cayó la red'));
    await montar();
    expect(document.body.textContent).toContain('se cayó la red');

    listar.mockResolvedValue([inquilino('a', 'Ana')]);
    const reintentar = Array.from(document.body.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('recibos.form.cliente.reintentar'),
    );
    expect(reintentar).toBeTruthy();
    await act(async () => reintentar!.click());
    expect(document.body.querySelector('[data-testid="cliente-recibo"]')).toBeTruthy();
  });
});
