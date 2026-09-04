/**
 * TablaDeBalance — con datos en la mano.
 *
 * Lo que se congela: que los totales del pie son los del informe (no una
 * suma que la tabla vuelve a hacer y puede hacer distinto), y que «no
 * cuadra» se grita como error con la diferencia adentro.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BalanceDePrueba as Balance } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: unknown) => String(d),
    formatNumber: (n: number) => String(n),
  }),
}));

import { TablaDeBalance } from './BalanceDePrueba';

const BALANCE_QUE_CUADRA: Balance = {
  desde: '2026-02-01',
  hasta: '2026-02-28',
  filas: [
    {
      cuentaId: 'c-1',
      codigo: '130505',
      nombre: 'Cartera de arrendamientos',
      naturaleza: 'DEBITO',
      saldoAnteriorCop: 200000,
      debitosCop: 1500000,
      creditosCop: 0,
      saldoFinalCop: 1700000,
    },
    {
      cuentaId: 'c-2',
      codigo: '415510',
      nombre: 'Comisiones inmobiliarias',
      naturaleza: 'CREDITO',
      saldoAnteriorCop: 0,
      debitosCop: 0,
      creditosCop: 1500000,
      saldoFinalCop: 1500000,
    },
  ],
  totalDebitosCop: 1500000,
  totalCreditosCop: 1500000,
  cuadra: true,
  diferenciaCop: 0,
};

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;

function montar(balance: Balance) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root!.render(<TablaDeBalance balance={balance} />);
  });
  return contenedor;
}

beforeEach(() => {
  root = null;
  contenedor = null;
});

afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
});

describe('TablaDeBalance', () => {
  it('pinta una fila por cuenta y los totales del informe en el pie', () => {
    const el = montar(BALANCE_QUE_CUADRA);
    expect(el.querySelectorAll('[data-testid="fila-de-balance"]')).toHaveLength(2);
    expect(el.querySelector('[data-testid="total-debitos"]')?.textContent).toBe('$1500000');
    expect(el.querySelector('[data-testid="total-creditos"]')?.textContent).toBe('$1500000');
    expect(el.textContent).toContain('130505');
    expect(el.textContent).toContain('Comisiones inmobiliarias');
  });

  it('cuando cuadra lo dice como estado, no como alerta', () => {
    const el = montar(BALANCE_QUE_CUADRA);
    const veredicto = el.querySelector('[data-testid="veredicto-del-balance"]')!;
    expect(veredicto.getAttribute('role')).toBe('status');
    expect(veredicto.textContent).toContain('Cuadra');
    expect(veredicto.textContent).not.toContain('No cuadra');
  });

  it('cuando NO cuadra es un alert con la diferencia y el lado', () => {
    const el = montar({
      ...BALANCE_QUE_CUADRA,
      totalCreditosCop: 1200000,
      cuadra: false,
      diferenciaCop: 300000,
    });
    const veredicto = el.querySelector('[data-testid="veredicto-del-balance"]')!;
    expect(veredicto.getAttribute('role')).toBe('alert');
    expect(veredicto.textContent).toContain('No cuadra');
    expect(veredicto.textContent).toContain('$300000');
    expect(veredicto.textContent).toContain('a favor de los débitos');
  });

  it('los ceros de débito/crédito quedan en blanco; el saldo final nunca', () => {
    const el = montar(BALANCE_QUE_CUADRA);
    const primera = el.querySelector('[data-testid="fila-de-balance"]')!;
    const celdas = Array.from(primera.querySelectorAll('td')).map((td) => td.textContent);
    // código, cuenta, saldo anterior, débitos, créditos, saldo final
    expect(celdas[4]).toBe('—');
    expect(celdas[5]).toBe('$1700000');
  });

  it('la naturaleza va en la misma línea que el nombre, no en un segundo renglón', () => {
    const el = montar(BALANCE_QUE_CUADRA);
    const celdaDeCuenta = el.querySelectorAll('[data-testid="fila-de-balance"] td')[1];
    // Un solo renglón: el nombre y el sufijo son hermanos dentro del mismo
    // contenedor en línea (la versión vieja usaba dos <span> block).
    expect(celdaDeCuenta.textContent).toContain('Cartera de arrendamientos');
    expect(celdaDeCuenta.textContent).toContain('débito');
    expect(celdaDeCuenta.querySelectorAll('.block')).toHaveLength(0);
  });

  it('con 99 cuentas la tabla no se va tres pantallas: pagina y los totales siguen siendo los del informe', () => {
    const muchas = Array.from({ length: 99 }, (_, i) => ({
      cuentaId: `c-${i}`,
      codigo: String(100000 + i),
      nombre: `Cuenta ${i}`,
      naturaleza: 'DEBITO' as const,
      saldoAnteriorCop: 0,
      debitosCop: 1000,
      creditosCop: 0,
      saldoFinalCop: 1000,
    }));
    const el = montar({ ...BALANCE_QUE_CUADRA, filas: muchas });

    // 10 es el tamaño de página por defecto del panel.
    expect(el.querySelectorAll('[data-testid="fila-de-balance"]')).toHaveLength(10);
    // El pie de totales NO es una suma que la tabla rehace sobre la página:
    // sale del informe y no cambia con la paginación.
    expect(el.querySelector('[data-testid="total-debitos"]')?.textContent).toBe('$1500000');
    // Y el pie de paginación existe y dice el total real.
    expect(el.textContent).toContain('99');
  });
});
