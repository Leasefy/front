/**
 * R1 (13-09): el servicio arma el cuerpo campo por campo. La llave que genera
 * el formulario se perdía acá y el servidor nunca la veía, así que un
 * reintento volvía a emitir.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ apiClient: { post } }));
vi.mock('./refresco-de-datos', () => ({ invalidar: vi.fn() }));
vi.mock('./inmobiliaria.service', () => ({ normalizeCobro: (c: unknown) => c }));

import { recibosDeCajaApi } from './recibos-de-caja.service';

describe('recibosDeCajaApi.crearPorCliente', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ recibos: [], cobros: [], totalCop: 0, deudaRestante: 0 });
  });

  it('🔴 manda la idempotencyKey en el cuerpo', async () => {
    await recibosDeCajaApi.crearPorCliente({
      cobroId: 'c-ago',
      valorCop: 1_000_000,
      medio: 'efectivo',
      idempotencyKey: 'llave-de-esta-apertura',
    });

    expect(post).toHaveBeenCalledTimes(1);
    const [ruta, cuerpo] = post.mock.calls[0];
    expect(String(ruta)).toMatch(/\/por-cliente$/);
    expect(cuerpo).toMatchObject({ cobroId: 'c-ago', idempotencyKey: 'llave-de-esta-apertura' });
  });

  it('sin llave no inventa una', async () => {
    await recibosDeCajaApi.crearPorCliente({ tenantId: 't1', valorCop: 5, medio: 'efectivo' });
    expect(post.mock.calls[0][1]).not.toHaveProperty('idempotencyKey');
  });
});
