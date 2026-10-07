/**
 * ARREGLOS-7 (de ARREGLOS-3, 03-10-2026) · Registrar la devolución y
 * «Revisado» cambian la deuda del contrato: la sección le pide a la pantalla
 * que vuelva a pedir el documento (los totales de arriba). Fuera de la
 * pantalla (sin el contexto) sigue funcionando igual.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { LiquidacionDelSaldoAFavor } from '@/lib/api/saldo-a-favor';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
const api = vi.hoisted(() => ({ liquidacion: vi.fn(), devolver: vi.fn(), revisado: vi.fn() }));
vi.mock('@/lib/api/saldo-a-favor', async (original) => ({
  ...(await original<typeof import('@/lib/api/saldo-a-favor')>()),
  saldoAFavorApi: api,
}));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({
    canAccess: (modulo: string, accion: string) => modulo === 'cobros' && accion === 'create',
  }),
}));

import { SaldoAFavorAlTerminarSeccion } from './SaldoAFavorAlTerminar';
import { ContextoDeRefrescarElEstado } from './refrescar-el-estado';

const TERMINADO: LiquidacionDelSaldoAFavor = {
  disponible: true,
  motivo: null,
  contrato: { id: 'ct-1', numero: '14', estado: 'EXPIRED', terminado: true },
  inquilino: { tenantId: 'inq-1', nombre: 'Ana Gómez', documento: '1020' },
  aFavor: { anticipoDelContratoCop: 900_000, saldoSueltoCop: 100_000, sueltoIncluido: true, totalCop: 1_000_000 },
  debeCop: 600_000,
  aDevolverCop: 400_000,
  devolucion: null,
  sePuedeDevolver: true,
  porQueNo: null,
};

const EN_REVISION: LiquidacionDelSaldoAFavor = {
  ...TERMINADO,
  sePuedeDevolver: false,
  devolucion: {
    egresoId: 'e-1',
    numero: null,
    estado: 'PENDIENTE',
    valorCop: 500_000,
    registradaEl: '2026-10-03',
    pagadaEl: null,
  },
  revision: {
    egresoId: 'e-1',
    contractId: 'ct-1',
    debeCop: 500_000,
    valorDelEgresoCop: 500_000,
    motivo: 'Después de registrar la devolución llegó deuda nueva.',
  },
};

let host: HTMLDivElement;
let root: Root;
const refrescar = vi.fn(async () => {});

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.liquidacion.mockReset();
  api.devolver.mockReset();
  api.revisado.mockReset();
  refrescar.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar(conContexto = true) {
  const seccion = <SaldoAFavorAlTerminarSeccion contractId="ct-1" />;
  await act(async () => {
    root.render(
      conContexto ? (
        <ContextoDeRefrescarElEstado.Provider value={refrescar}>{seccion}</ContextoDeRefrescarElEstado.Provider>
      ) : (
        seccion
      ),
    );
  });
}

const porTestId = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function clic(id: string) {
  const el = porTestId(id);
  expect(el).not.toBeNull();
  await act(async () => {
    el!.click();
  });
}

describe('<SaldoAFavorAlTerminarSeccion> — los totales de alrededor', () => {
  it('registrar la devolución le pide a la pantalla los totales nuevos', async () => {
    api.liquidacion.mockResolvedValue(TERMINADO);
    api.devolver.mockResolvedValue({
      aplicadoCop: 600_000,
      recibos: 1,
      aDevolverCop: 400_000,
      egreso: { id: 'e-1', estado: 'PENDIENTE', valorCop: 400_000 },
    });
    await montar();
    await clic('registrar-devolucion');
    await clic('confirmar-devolucion');

    expect(api.devolver).toHaveBeenCalledTimes(1);
    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(porTestId('devolucion-registrada')).not.toBeNull();
  });

  it('«Revisado» también', async () => {
    api.liquidacion.mockResolvedValue(EN_REVISION);
    api.revisado.mockResolvedValue({
      anterior: { egresoId: 'e-1', valorCop: 500_000 },
      aplicadoCop: 500_000,
      recibos: 1,
      aDevolverCop: 0,
      egreso: null,
    });
    await montar();
    await clic('marcar-revisada');

    expect(api.revisado).toHaveBeenCalledWith('ct-1');
    expect(refrescar).toHaveBeenCalledTimes(1);
  });

  it('si el back la rechaza, no pide nada', async () => {
    api.liquidacion.mockResolvedValue(TERMINADO);
    api.devolver.mockRejectedValue(new Error('no'));
    await montar();
    await clic('registrar-devolucion');
    await clic('confirmar-devolucion');

    expect(refrescar).not.toHaveBeenCalled();
  });

  it('sin la pantalla alrededor (sin contexto) registra igual', async () => {
    api.liquidacion.mockResolvedValue(TERMINADO);
    api.devolver.mockResolvedValue({
      aplicadoCop: 600_000,
      recibos: 1,
      aDevolverCop: 400_000,
      egreso: { id: 'e-1', estado: 'PENDIENTE', valorCop: 400_000 },
    });
    await montar(false);
    await clic('registrar-devolucion');
    await clic('confirmar-devolucion');

    expect(api.devolver).toHaveBeenCalledTimes(1);
    expect(porTestId('devolucion-registrada')).not.toBeNull();
  });
});
