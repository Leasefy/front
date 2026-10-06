import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { get },
}));

import { recibosDeCajaApi } from './recibos-de-caja.service';

/**
 * 🔴 PG-R12 (QA de Pagos, 03-10-2026): la cuenta de cobro sale de la CUOTA. La
 * cuota no trae el `status` de un cobro: el estado del documento se deduce de
 * lo pagado, sin inventar mora.
 */
describe('la cuenta de cobro de una cuota', () => {
  beforeEach(() => get.mockReset());

  const base = { id: 'q1', cuotaId: 'q1', cobroId: null, origen: 'CUOTA', month: '2026-10', totalWithFees: 1_000_000 };

  it('pide la ruta de la cuota', async () => {
    get.mockResolvedValue({ ...base, paidAmount: 0, pendingAmount: 1_000_000, daysLate: 0 });
    await recibosDeCajaApi.cuentaDeCobroDeLaCuota('q1');
    expect(get).toHaveBeenCalledWith('/inmobiliaria/recibos-de-caja/cuotas/q1/cuenta-de-cobro');
  });

  it.each([
    [{ paidAmount: 1_000_000, pendingAmount: 0, daysLate: 0 }, 'paid'],
    [{ paidAmount: 0, pendingAmount: 1_000_000, daysLate: 3 }, 'late'],
    [{ paidAmount: 400_000, pendingAmount: 600_000, daysLate: 0 }, 'partial'],
    [{ paidAmount: 0, pendingAmount: 1_000_000, daysLate: 0 }, 'pending'],
  ])('%o → %s', async (montos, estado) => {
    get.mockResolvedValue({ ...base, ...montos });
    expect((await recibosDeCajaApi.cuentaDeCobroDeLaCuota('q1')).status).toBe(estado);
  });
});
