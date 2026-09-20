/**
 * El anticipo del contrato en el estado de cuenta: cuánto entró, cuánto se
 * descontó mes a mes (con su recibo) y cuánto queda. Nada si no hay; un aviso
 * si no se pudo leer (callarse haría creer que no hay saldo).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { AnticipoDelContrato } from '@/lib/api/recibos-de-caja.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
const api = vi.hoisted(() => ({ anticipoDelContrato: vi.fn() }));
vi.mock('@/lib/api/recibos-de-caja.service', () => ({ recibosDeCajaApi: api }));

import { AnticipoDelContratoSeccion, hayAnticipoQueMostrar } from './AnticipoDelContrato';

const CON_SALDO: AnticipoDelContrato = {
  contractId: 'ct-1',
  disponible: true,
  saldoCop: 10_000_000,
  recibidoCop: 12_000_000,
  descontadoCop: 2_000_000,
  movimientos: [
    { id: 'm1', fecha: '2026-09-16', tipo: 'ENTRADA', valorCop: 12_000_000, mes: null, medio: 'transferencia', referencia: null, notas: null, reciboDeCajaId: null, reciboNumero: null, anulado: false },
    { id: 'm2', fecha: '2026-10-05', tipo: 'DESCUENTO', valorCop: -1_000_000, mes: '2026-10', medio: 'anticipo', referencia: null, notas: null, reciboDeCajaId: 'r1', reciboNumero: 41, anulado: false },
  ],
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.anticipoDelContrato.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar() {
  await act(async () => {
    root.render(<AnticipoDelContratoSeccion contractId="ct-1" />);
  });
}

describe('<AnticipoDelContratoSeccion>', () => {
  it('muestra el saldo, lo recibido, lo descontado y cada descuento con su recibo', async () => {
    api.anticipoDelContrato.mockResolvedValue(CON_SALDO);
    await montar();
    expect(api.anticipoDelContrato).toHaveBeenCalledWith('ct-1');
    expect(host.querySelector('[data-testid="anticipo-del-contrato"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="anticipo-saldo"]')?.textContent).toMatch(/10\.000\.000/);
    const descuento = host.querySelector('[data-testid="anticipo-movimiento-m2"]')?.textContent ?? '';
    expect(descuento).toContain('Recibo 41');
    expect(descuento).toContain('Descuento de');
  });

  it('sin movimientos o sin la migración no dice nada', async () => {
    api.anticipoDelContrato.mockResolvedValue({ ...CON_SALDO, movimientos: [], saldoCop: 0 });
    await montar();
    expect(host.textContent).toBe('');
    expect(hayAnticipoQueMostrar({ ...CON_SALDO, disponible: false })).toBe(false);
  });

  it('si no se pudo leer, lo dice', async () => {
    api.anticipoDelContrato.mockRejectedValue(new Error('red'));
    await montar();
    expect(host.querySelector('[data-testid="anticipo-del-contrato-error"]')?.textContent).toContain(
      'No pudimos leer el anticipo',
    );
  });
});
