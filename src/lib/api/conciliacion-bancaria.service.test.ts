import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock, postMock, putMock, invalidarMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  invalidarMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
}));
vi.mock('./refresco-de-datos', () => ({ invalidar: (...args: unknown[]) => invalidarMock(...args) }));

import {
  conciliacionBancariaApi,
  diferenciaParaElBack,
  filaParaElBack,
} from './conciliacion-bancaria.service';

const BASE = '/inmobiliaria/conciliacion-bancaria';

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  putMock.mockResolvedValue({});
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

    await conciliacionBancariaApi.conciliar('m-1', { cobroId: 'c-1' });
    expect(postMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-1/conciliar`, { cobroId: 'c-1' });
    expect(invalidarMock).toHaveBeenCalledWith('cobros');

    /*
     * 🔴 Va UNA sola clave. El back valida con `forbidNonWhitelisted`: mandar
     * `cobroId: undefined` junto a `tenantId` es un 400 de la petición entera,
     * y es exactamente lo que produciría un spread del destino.
     */
    await conciliacionBancariaApi.conciliar('m-2', { tenantId: 'u-9' });
    expect(postMock).toHaveBeenLastCalledWith(`${BASE}/movimientos/m-2/conciliar`, {
      tenantId: 'u-9',
    });

    await conciliacionBancariaApi.ignorar('m-1', 'Nómina');
    expect(postMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-1/ignorar`, { motivo: 'Nómina' });

    await conciliacionBancariaApi.reabrir('m-1');
    expect(postMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-1/reabrir`, {});

    await conciliacionBancariaApi.conciliarSeguros();
    expect(postMock).toHaveBeenCalledWith(`${BASE}/conciliar-seguros`, {});
  });
});

describe('conciliacionBancariaApi — muchos a uno: un movimiento son varios recibos (02-10)', () => {
  it('recibosQueSuman pide las combinaciones del movimiento por GET, sin cuerpo', async () => {
    const respuesta = { propuestas: [], ambigua: false, agotada: false, sePuedeAplicar: true };
    getMock.mockResolvedValueOnce(respuesta);
    await expect(conciliacionBancariaApi.recibosQueSuman('m-7')).resolves.toBe(respuesta);
    expect(getMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-7/recibos-que-suman`);
    expect(getMock.mock.calls[0]).toHaveLength(1);
    // Leer no cambia nada: no despierta a nadie.
    expect(invalidarMock).not.toHaveBeenCalled();
  });

  it('conciliarConRecibos manda SÓLO `reciboIds` (forbidNonWhitelisted) y despierta a cobros', async () => {
    const ids = ['r-1', 'r-2', 'r-3'];
    await conciliacionBancariaApi.conciliarConRecibos('m-7', ids);
    expect(postMock).toHaveBeenCalledWith(`${BASE}/movimientos/m-7/conciliar-con-recibos`, {
      reciboIds: ['r-1', 'r-2', 'r-3'],
    });
    const cuerpo = postMock.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(cuerpo)).toEqual(['reciboIds']);
    // Una copia: si quien llama muta su arreglo después, el cuerpo no cambia.
    expect(cuerpo.reciboIds).not.toBe(ids);
    expect(invalidarMock).toHaveBeenCalledWith('cobros');
  });

  it('si el back dice que no, el error sube tal cual y no se despierta a nadie', async () => {
    const rechazo = Object.assign(new Error('Uno de los recibos ya está conciliado.'), {
      status: 409,
      code: 'RECIBO_YA_CONCILIADO',
    });
    postMock.mockRejectedValueOnce(rechazo);
    await expect(conciliacionBancariaApi.conciliarConRecibos('m-7', ['r-1'])).rejects.toBe(rechazo);
    expect(invalidarMock).not.toHaveBeenCalled();
  });
});

describe('conciliacionBancariaApi — diferencias conocidas de la inmobiliaria (02-10)', () => {
  it('diferenciasConocidas lee por GET', async () => {
    await conciliacionBancariaApi.diferenciasConocidas();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/diferencias-conocidas`);
  });

  it('guardar manda por PUT la lista entera, cada una con SÓLO las claves de su tipo', async () => {
    await conciliacionBancariaApi.guardarDiferenciasConocidas([
      { nombre: '  Retención arrendamientos ', tipo: 'RETENCION', porcentaje: 3.5, aQuien: 'empresas' },
      { nombre: 'Comisión ACH', tipo: 'COMISION', valorCop: 6500, aQuien: 'todos' },
    ]);
    expect(putMock).toHaveBeenCalledWith(`${BASE}/diferencias-conocidas`, {
      diferencias: [
        { nombre: 'Retención arrendamientos', tipo: 'RETENCION', porcentaje: 3.5, aQuien: 'empresas' },
        { nombre: 'Comisión ACH', tipo: 'COMISION', valorCop: 6500, aQuien: 'todos' },
      ],
    });
    // 🔴 Una retención con `valorCop` (o una comisión con `porcentaje`) es un 400.
    const retencion = diferenciaParaElBack({
      nombre: 'x',
      tipo: 'RETENCION',
      porcentaje: 1,
      aQuien: 'todos',
      valorCop: 99,
    } as never);
    expect(Object.keys(retencion)).toEqual(['nombre', 'tipo', 'porcentaje', 'aQuien']);
  });

  it('guardar sin diferencias manda la lista vacía (las borra todas)', async () => {
    await conciliacionBancariaApi.guardarDiferenciasConocidas([]);
    expect(putMock).toHaveBeenCalledWith(`${BASE}/diferencias-conocidas`, { diferencias: [] });
  });
});

describe('conciliacionBancariaApi — el lote de lo que calza exacto (17-09)', () => {
  it('leer, armar, aprobar y reversar pegan a sus rutas con el cuerpo exacto', async () => {
    await conciliacionBancariaApi.loteActual();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/lotes/actual`);

    await conciliacionBancariaApi.armarLote();
    expect(postMock).toHaveBeenLastCalledWith(`${BASE}/lotes`, {});

    await conciliacionBancariaApi.aprobarLote('l-1');
    expect(postMock).toHaveBeenLastCalledWith(`${BASE}/lotes/l-1/aprobar`, {});
    expect(invalidarMock).toHaveBeenCalledWith('cobros');

    invalidarMock.mockReset();
    await conciliacionBancariaApi.reversarLote('l-1', 'Extracto de otra cuenta');
    expect(postMock).toHaveBeenLastCalledWith(`${BASE}/lotes/l-1/reversar`, {
      motivo: 'Extracto de otra cuenta',
    });
    expect(invalidarMock).toHaveBeenCalledWith('cobros');
  });
});
