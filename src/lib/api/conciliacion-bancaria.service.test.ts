import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock, postMock, invalidarMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  invalidarMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));
vi.mock('./refresco-de-datos', () => ({ invalidar: (...args: unknown[]) => invalidarMock(...args) }));

import { conciliacionBancariaApi, filaParaElBack } from './conciliacion-bancaria.service';

const BASE = '/inmobiliaria/conciliacion-bancaria';

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  invalidarMock.mockReset();
  postMock.mockResolvedValue({});
  getMock.mockResolvedValue({});
});

describe('conciliacionBancariaApi — el contrato con el back', () => {
  it('cargarExtracto manda nombre y filas con las claves exactas; la referencia vacía no viaja', async () => {
    await conciliacionBancariaApi.cargarExtracto('sep.csv', [
      { fecha: '2026-09-03', valorCop: 1800000, descripcion: 'PAGO', referencia: '12' },
      { fecha: '2026-09-04', valorCop: -45000, descripcion: 'CUOTA', referencia: '' },
    ]);
    expect(postMock).toHaveBeenCalledWith(`${BASE}/extracto`, {
      nombreArchivo: 'sep.csv',
      filas: [
        { fecha: '2026-09-03', valorCop: 1800000, descripcion: 'PAGO', referencia: '12' },
        { fecha: '2026-09-04', valorCop: -45000, descripcion: 'CUOTA' },
      ],
    });
    expect(Object.keys(filaParaElBack({ fecha: 'f', valorCop: 1, descripcion: 'd' }))).toEqual([
      'fecha',
      'valorCop',
      'descripcion',
    ]);
    expect(invalidarMock).toHaveBeenCalledWith('cobros');
  });

  it('listar arma la query sólo con lo que viene', async () => {
    await conciliacionBancariaApi.listar({ estado: 'PENDIENTE', limite: 20 });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/movimientos?estado=PENDIENTE&limite=20`);
    await conciliacionBancariaApi.listar();
    expect(getMock).toHaveBeenLastCalledWith(`${BASE}/movimientos`);
  });

  it('resumen, conciliar, ignorar, reabrir y conciliar-seguros pegan a sus rutas con el cuerpo exacto', async () => {
    await conciliacionBancariaApi.resumen();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/resumen`);

    await conciliacionBancariaApi.conciliar('m-1', 'c-1');
    expect(postMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-1/conciliar`, { cobroId: 'c-1' });
    expect(invalidarMock).toHaveBeenCalledWith('cobros');

    await conciliacionBancariaApi.ignorar('m-1', 'Nómina');
    expect(postMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-1/ignorar`, { motivo: 'Nómina' });

    await conciliacionBancariaApi.reabrir('m-1');
    expect(postMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-1/reabrir`, {});

    await conciliacionBancariaApi.conciliarSeguros();
    expect(postMock).toHaveBeenCalledWith(`${BASE}/conciliar-seguros`, {});
  });
});
