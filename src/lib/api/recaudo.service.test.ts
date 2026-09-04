/**
 * Las rutas del recaudo, exactas: el back valida el mes con una regex y
 * acota los meses de la serie, así que lo que viaja en la query es contrato.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

import { recaudoApi } from './recaudo.service';

describe('recaudoApi', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('pide el resumen del mes por query', async () => {
    getMock.mockResolvedValueOnce({ month: '2026-09' });
    const r = await recaudoApi.resumen('2026-09');
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/recaudo/resumen?month=2026-09');
    expect(r).toEqual({ month: '2026-09' });
  });

  it('pide la serie con los meses y el mes de cierre', async () => {
    getMock.mockResolvedValueOnce([]);
    await recaudoApi.serie(12, '2026-09');
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/recaudo/serie?meses=12&hasta=2026-09');
  });

  it('un error del back sube tal cual', async () => {
    getMock.mockRejectedValueOnce(new Error('El mes tiene que ser YYYY-MM.'));
    await expect(recaudoApi.resumen('2026-13')).rejects.toThrow('El mes tiene que ser YYYY-MM.');
  });
});
