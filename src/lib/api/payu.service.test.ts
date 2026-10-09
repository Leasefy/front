/**
 * Las tres rutas de Payu, exactas: lo que viaja en la query es contrato con el
 * back (`payu-api-front.md`, formas fijadas el 26-09).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

import { payuApi } from './payu.service';

describe('payuApi', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('pide los links del mes con la página y el tamaño por defecto (1 y 20)', async () => {
    getMock.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 20 });
    await payuApi.links({ mes: '2026-10' });
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/cobros/links?mes=2026-10&page=1&limit=20');
  });

  it('con estado, lo manda; sin estado, no manda la llave vacía', async () => {
    getMock.mockResolvedValue({ items: [], total: 0, page: 2, limit: 50 });
    await payuApi.links({ mes: '2026-10', estado: 'vencido', page: 2, limit: 50 });
    expect(getMock).toHaveBeenLastCalledWith(
      '/inmobiliaria/cobros/links?mes=2026-10&estado=vencido&page=2&limit=50',
    );
    await payuApi.links({ mes: '2026-10', estado: undefined });
    expect(getMock.mock.calls.at(-1)?.[0]).not.toContain('estado=');
  });

  it('pide el resumen del mes', async () => {
    getMock.mockResolvedValueOnce({ mes: '2026-10', payuActivo: false });
    const r = await payuApi.resumen('2026-10');
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/cobros/links/resumen?mes=2026-10');
    expect(r).toEqual({ mes: '2026-10', payuActivo: false });
  });

  it('pide los autopagos de la inmobiliaria', async () => {
    getMock.mockResolvedValueOnce({ cobroAutomaticoActivo: false, items: [] });
    await payuApi.autopagos();
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/autopago');
  });

  it('un error del back sube tal cual', async () => {
    getMock.mockRejectedValueOnce(new Error('El mes tiene que ser YYYY-MM.'));
    await expect(payuApi.resumen('2026-13')).rejects.toThrow('El mes tiene que ser YYYY-MM.');
  });
});
