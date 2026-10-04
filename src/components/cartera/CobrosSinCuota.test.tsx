import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  esAdmin: true,
  listar: vi.fn(),
  reaplicar: vi.fn(),
  confirmar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ isAdmin: h.esAdmin }),
}));
vi.mock('@/lib/api/cobros-fantasma.service', () => ({
  cobrosFantasmaApi: { listar: () => h.listar(), reaplicar: (id: string) => h.reaplicar(id) },
}));
vi.mock('@/components/ui/confirmar', () => ({ confirmar: (o: unknown) => h.confirmar(o) }));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));

import { CobrosSinCuota } from './CobrosSinCuota';

/**
 * PG-07 (QA de Pagos, 03-10-2026): lo que Iván pagó a los cobros de junio y
 * julio (meses que su contrato no cobra) no estaba en su estado de cuenta.
 * El administrador ve esos cobros y re-aplica su plata a la deuda real.
 */
const JULIO = {
  cobroId: 'c-jul',
  contractId: 'ct-3',
  contratoNumero: 3,
  tenantName: 'Iván Inquilino Pérez Gómez',
  month: '2026-07',
  totalCop: 2_350_000,
  pagadoCop: 1_723_888,
  pendienteCop: 626_112,
  recibos: [
    { id: 'r6', numero: 6, valorCop: 123_457, fecha: '2026-10-03', medio: 'pse' },
    { id: 'r14', numero: 14, valorCop: 1_510_431, fecha: '2026-10-03', medio: 'pse' },
  ],
  accion: 'REAPLICAR' as const,
};
const SIN_PLATA = { ...JULIO, cobroId: 'c-jun', month: '2026-06', pagadoCop: 0, recibos: [], accion: 'ANULAR' as const };

let host: HTMLDivElement;
let root: Root;

async function montar(onReaplicado = vi.fn()) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<CobrosSinCuota onReaplicado={onReaplicado} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return onReaplicado;
}

beforeEach(() => {
  h.esAdmin = true;
  h.listar.mockReset();
  h.reaplicar.mockReset();
  h.confirmar.mockReset();
  h.toast.success.mockReset();
  h.toast.error.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('<CobrosSinCuota>', () => {
  it('al administrador le dice cuántos hay y cuánta plata no está en la deuda real', async () => {
    h.listar.mockResolvedValue([JULIO, SIN_PLATA]);
    await montar();
    const aviso = document.body.querySelector('[data-testid="cobros-sin-cuota"]')?.textContent ?? '';
    expect(aviso).toContain('Hay 2 cobros sin cuota');
    expect(aviso).toMatch(/1\.723\.888/);
  });

  it('a quien no es administrador no le pide nada ni le muestra nada', async () => {
    h.esAdmin = false;
    h.listar.mockResolvedValue([JULIO]);
    await montar();
    expect(h.listar).not.toHaveBeenCalled();
    expect(document.body.querySelector('[data-testid="cobros-sin-cuota"]')).toBeNull();
  });

  it('sin cobros sin cuota no aparece', async () => {
    h.listar.mockResolvedValue([]);
    await montar();
    expect(document.body.querySelector('[data-testid="cobros-sin-cuota"]')).toBeNull();
  });

  it('re-aplicar pregunta antes, mueve la plata y relee', async () => {
    h.listar.mockResolvedValueOnce([JULIO]).mockResolvedValueOnce([]);
    h.confirmar.mockResolvedValue(true);
    h.reaplicar.mockResolvedValue({
      cobroId: 'c-jul',
      month: '2026-07',
      recibos: [
        { anulado: { id: 'r6', numero: 6, valorCop: 123_457 }, nuevos: [{ id: 'n1', numero: 30, mes: '2026-08', valorCop: 123_457 }], linea: null },
        { anulado: { id: 'r14', numero: 14, valorCop: 1_510_431 }, nuevos: [{ id: 'n2', numero: 31, mes: '2026-08', valorCop: 1_510_431 }], linea: null },
      ],
    });
    const onReaplicado = await montar();
    await act(async () => {
      (document.body.querySelector('[data-testid="cobros-sin-cuota-revisar"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (document.body.querySelector('[data-testid="reaplicar-cobro-sin-cuota"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.confirmar).toHaveBeenCalledTimes(1);
    expect(h.reaplicar).toHaveBeenCalledWith('c-jul');
    expect(h.toast.success).toHaveBeenCalled();
    expect(onReaplicado).toHaveBeenCalled();
  });

  it('si no se confirma, no se mueve nada', async () => {
    h.listar.mockResolvedValue([JULIO]);
    h.confirmar.mockResolvedValue(false);
    await montar();
    await act(async () => {
      (document.body.querySelector('[data-testid="cobros-sin-cuota-revisar"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (document.body.querySelector('[data-testid="reaplicar-cobro-sin-cuota"]') as HTMLButtonElement).click();
    });
    expect(h.reaplicar).not.toHaveBeenCalled();
  });
});
