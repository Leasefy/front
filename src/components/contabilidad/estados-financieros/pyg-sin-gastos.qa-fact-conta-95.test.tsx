/**
 * QA-FACT-CONTA-95 r2 · CB-C-09: el P&G de un mes SIN gastos lo dice y lleva a
 * Gastos (donde se registran y se causan las facturas de proveedor). Con gastos,
 * la nota no sale.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { EstadoDeResultados } from '@/lib/api/estados-financieros.service';
import { notaSinGastosDelMes } from '@/lib/contabilidad/estados-financieros';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, finanzas } = vi.hoisted(() => ({
  api: { pyg: vi.fn(), balanceGeneral: vi.fn(), mayor: vi.fn(), terceros: vi.fn() },
  finanzas: { sedes: vi.fn() },
}));
vi.mock('@/lib/api/estados-financieros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/estados-financieros.service')>(
    '@/lib/api/estados-financieros.service',
  );
  return { ...actual, estadosFinancierosApi: api };
});
vi.mock('@/lib/api/finanzas.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/finanzas.service')>('@/lib/api/finanzas.service');
  return { ...actual, finanzasApi: finanzas };
});
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { EstadosFinancieros } from './EstadosFinancieros';

const pyg = (gastosMesCop: number): EstadoDeResultados =>
  ({
    mes: '2026-08',
    mesDelAnioAnterior: '2025-08',
    sedeId: null,
    desdeElAcumulado: '2026-01-01',
    clases: [],
    resultado: {
      ingresosMesCop: 133_000,
      gastosMesCop,
      utilidadMesCop: 133_000 - gastosMesCop,
      margenMesPct: 100,
      ingresosAcumuladoCop: 133_000,
      gastosAcumuladoCop: gastosMesCop,
      utilidadAcumuladoCop: 133_000 - gastosMesCop,
      margenAcumuladoPct: 100,
    },
    porRubro: { disponible: true, filas: [] },
    elCanonNoEsIngreso: 'El canon no es ingreso.',
    avisos: [],
    sinAsentar: { recibos: 0, lotes: 0, cobros: 0, total: 0 },
    movimientosSinSede: 0,
  }) as unknown as EstadoDeResultados;

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  finanzas.sedes.mockReset().mockResolvedValue({ sedes: [] });
  api.balanceGeneral.mockReset();
});
afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<EstadosFinancieros inicial="pyg" />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('CB-C-09 · P&G sin gastos', () => {
  it('la frase dice que no hay gastos asentados y por qué la utilidad sale inflada', () => {
    expect(notaSinGastosDelMes(0)).toMatch(/no tiene gastos asentados/);
    expect(notaSinGastosDelMes(0)).toMatch(/Gastos/);
    expect(notaSinGastosDelMes(119_000)).toBeNull();
  });

  it('un mes sin gastos muestra la nota con el enlace a Gastos', async () => {
    api.pyg.mockReset().mockResolvedValue(pyg(0));
    await pintar();
    expect(q('pyg-sin-gastos')?.textContent).toMatch(/no tiene gastos asentados/);
    expect(q('pyg-ir-a-gastos')?.getAttribute('href')).toBe('/panel/inmobiliaria/contabilidad/gastos');
  });

  it('un mes con gastos no la muestra', async () => {
    api.pyg.mockReset().mockResolvedValue(pyg(3_325_900));
    await pintar();
    expect(q('pyg-sin-gastos')).toBeNull();
  });
});
