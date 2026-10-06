/**
 * CB-22 (QA de Contabilidad, 03-10-2026): a 390 px el balance de prueba se
 * corría de lado y no se veía el saldo. Bajo 768 px cada cuenta es una tarjeta
 * con sus cuatro cifras y los totales al final.
 */
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BalanceDePrueba } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const celular = vi.hoisted(() => ({ valor: true }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => celular.valor }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}` }),
}));

import { TablaDeBalance } from './BalanceDePrueba';

const balance = {
  desde: '2026-10-01',
  hasta: '2026-10-03',
  cuadra: true,
  diferenciaCop: 0,
  totalDebitosCop: 1_500_000,
  totalCreditosCop: 1_500_000,
  filas: [
    {
      cuentaId: 'c1',
      codigo: '110505',
      nombre: 'Caja general',
      naturaleza: 'DEBITO',
      saldoAnteriorCop: 0,
      debitosCop: 1_500_000,
      creditosCop: 0,
      saldoFinalCop: 1_500_000,
    },
    {
      cuentaId: 'c2',
      codigo: '28150505',
      nombre: 'Canon recaudado para propietarios',
      naturaleza: 'CREDITO',
      saldoAnteriorCop: 0,
      debitosCop: 0,
      creditosCop: 1_500_000,
      saldoFinalCop: -1_500_000,
    },
  ],
} as unknown as BalanceDePrueba;

let host: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function pintar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<TablaDeBalance balance={balance} />));
}

describe('<TablaDeBalance> · CB-22', () => {
  it('🔴 bajo 768 px: tarjetas con código, cuenta y sus cifras; sin tabla', () => {
    celular.valor = true;
    pintar();
    expect(host.querySelector('table')).toBeNull();
    const tarjetas = host.querySelectorAll('[data-testid="tarjeta-de-balance"]');
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[1].textContent).toContain('28150505');
    expect(tarjetas[1].textContent).toContain('Canon recaudado para propietarios');
    expect(tarjetas[1].textContent).toContain('Saldo final');
    expect(host.querySelector('[data-testid="total-debitos"]')!.textContent).toContain('1.500.000');
  });

  it('en escritorio sigue la tabla', () => {
    celular.valor = false;
    pintar();
    expect(host.querySelector('table')).not.toBeNull();
    expect(host.querySelector('[data-testid="tarjetas-de-balance"]')).toBeNull();
  });
});
