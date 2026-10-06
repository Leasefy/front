/**
 * 🔴 QA-FACT-CONTA-95 r3 · CB-T-01 (lo vio el fork contable de Migración): en
 * un mes sin movimiento el balance mostraba las cuentas con su saldo anterior y
 * el pie «Totales del período $ 0 / $ 0», como si el libro estuviera vacío.
 * Ahora el pie trae los SALDOS (anterior y final) partidos en débito y crédito,
 * y la descarga también.
 */
import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BalanceDePrueba as Balance } from '@/lib/api/contabilidad.service';
import { tablasDelBalanceDePrueba } from '@/lib/contabilidad/tablas-de-los-informes';

const { balanceDePrueba } = vi.hoisted(() => ({ balanceDePrueba: vi.fn() }));
vi.mock('@/lib/api/contabilidad.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>('@/lib/api/contabilidad.service');
  return { ...real, contabilidadApi: { ...real.contabilidadApi, reportes: { ...real.contabilidadApi.reportes, balanceDePrueba } } };
});

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: unknown) => String(d),
    formatNumber: (n: number) => String(n),
  }),
}));

import { BalanceDePrueba, TablaDeBalance } from './BalanceDePrueba';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Octubre sin movimiento: caja con saldo y un banco en sobregiro (saldo crédito). */
const MES_SIN_MOVIMIENTO: Balance = {
  desde: '2026-10-01',
  hasta: '2026-10-06',
  filas: [
    { cuentaId: 'caja', codigo: '110505', nombre: 'Caja general', naturaleza: 'DEBITO', saldoAnteriorCop: 2_500_000, debitosCop: 0, creditosCop: 0, saldoFinalCop: 2_500_000 },
    { cuentaId: 'banco', codigo: '11100501', nombre: 'Banco Andino', naturaleza: 'DEBITO', saldoAnteriorCop: -1_000_000, debitosCop: 0, creditosCop: 0, saldoFinalCop: -1_000_000 },
    { cuentaId: 'capital', codigo: '310505', nombre: 'Capital', naturaleza: 'CREDITO', saldoAnteriorCop: 1_500_000, debitosCop: 0, creditosCop: 0, saldoFinalCop: 1_500_000 },
  ],
  totalDebitosCop: 0,
  totalCreditosCop: 0,
  saldosAnteriores: { debitoCop: 2_500_000, creditoCop: 2_500_000 },
  saldosFinales: { debitoCop: 2_500_000, creditoCop: 2_500_000 },
  cuadra: true,
  diferenciaCop: 0,
};

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
  root = null;
  contenedor = null;
});
function montar(balance: Balance) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => root!.render(<TablaDeBalance balance={balance} />));
  return contenedor;
}
const texto = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;

describe('CB-T-01 · el pie del balance trae los saldos', () => {
  it('un mes sin movimiento: el período en $ 0, pero los saldos débito y crédito con lo que hay en el libro', () => {
    const c = montar(MES_SIN_MOVIMIENTO);
    expect(texto(c, 'total-debitos')).toBe('$0');
    expect(texto(c, 'saldo-anterior-debito')).toBe('$2500000');
    expect(texto(c, 'saldo-anterior-credito')).toBe('$2500000');
    expect(texto(c, 'saldo-final-debito')).toBe('$2500000');
    expect(texto(c, 'saldo-final-credito')).toBe('$2500000');
    expect(texto(c, 'saldos-debito')).toContain('Saldos débito');
  });

  it('un back viejo (sin los saldos) no rompe la tabla: el pie de siempre', () => {
    const { saldosAnteriores: _a, saldosFinales: _f, ...viejo } = MES_SIN_MOVIMIENTO;
    const c = montar(viejo);
    expect(c.querySelector('[data-testid="saldos-debito"]')).toBeNull();
    expect(texto(c, 'total-creditos')).toBe('$0');
  });

  it('la descarga lleva los saldos en su pie', () => {
    const [tabla] = tablasDelBalanceDePrueba(MES_SIN_MOVIMIENTO);
    expect(tabla.pie).toEqual([
      ['Totales del período', null, null, null, 0, 0, null],
      ['Saldos débito', null, null, 2_500_000, null, null, 2_500_000],
      ['Saldos crédito', null, null, 2_500_000, null, null, 2_500_000],
    ]);
  });
});

describe('CB-C-14 · sólo cuenta la respuesta del último pedido', () => {
  it('quitar «Desde» y luego «Hasta»: si el primer pedido llega tarde, la tabla muestra el del último', async () => {
    const conHasta: Balance = { ...MES_SIN_MOVIMIENTO, desde: null, hasta: '2026-10-06', totalDebitosCop: 100, totalCreditosCop: 100 };
    const sinFechas: Balance = { ...MES_SIN_MOVIMIENTO, desde: null, hasta: null, totalDebitosCop: 185, totalCreditosCop: 185 };
    let soltarElPrimero: (b: Balance) => void = () => undefined;
    balanceDePrueba.mockReset();
    balanceDePrueba
      .mockResolvedValueOnce(MES_SIN_MOVIMIENTO) // el de octubre, al montar
      .mockImplementationOnce(() => new Promise<Balance>((r) => { soltarElPrimero = r; })) // sin «Desde», con «Hasta»: llega tarde
      .mockResolvedValueOnce(sinFechas); // sin fechas
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    root = createRoot(contenedor);
    await act(async () => root!.render(<BalanceDePrueba />));
    const quitar = (id: string) => (contenedor!.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click();
    await act(async () => quitar('rango-desde-quitar'));
    await act(async () => quitar('rango-hasta-quitar'));
    expect(texto(contenedor, 'total-debitos')).toBe('$185');
    await act(async () => soltarElPrimero(conHasta));
    expect(texto(contenedor, 'total-debitos')).toBe('$185');
    expect(balanceDePrueba).toHaveBeenLastCalledWith({ desde: undefined, hasta: undefined, soloConMovimiento: true });
  });
});
