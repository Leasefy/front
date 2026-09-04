import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import { cuerpoDeMedio, mediosDePagoApi, ordenarMedios } from './medios-de-pago.service';
import type { MedioDePago } from './medios-de-pago.types';

function medio(extra: Partial<MedioDePago> = {}): MedioDePago {
  return {
    id: 'm1',
    agencyId: 'a1',
    tipo: 'TRANSFERENCIA',
    nombre: 'Transferencia',
    instrucciones: null,
    banco: 'Bancolombia',
    tipoDeCuenta: 'AHORROS',
    numeroDeCuenta: '123',
    titular: 'Portofino',
    documentoTitular: null,
    enlace: null,
    visibleAlInquilino: true,
    activo: true,
    orden: 0,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...extra,
  };
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
  del.mockReset();
});

describe('cuerpoDeMedio — el juego exacto de claves', () => {
  it('manda sólo lo que viene, recorta el nombre y convierte el vacío en null', () => {
    expect(
      cuerpoDeMedio({
        tipo: 'TRANSFERENCIA',
        nombre: '  Transferencia  ',
        banco: 'Bancolombia',
        tipoDeCuenta: 'AHORROS',
        numeroDeCuenta: '123',
        titular: 'Portofino',
        instrucciones: '   ',
      }),
    ).toEqual({
      tipo: 'TRANSFERENCIA',
      nombre: 'Transferencia',
      banco: 'Bancolombia',
      tipoDeCuenta: 'AHORROS',
      numeroDeCuenta: '123',
      titular: 'Portofino',
      instrucciones: null,
    });
  });

  it('un parche con sólo `activo` no arrastra claves de más', () => {
    expect(cuerpoDeMedio({ activo: false })).toEqual({ activo: false });
  });
});

describe('mediosDePagoApi — rutas y verbos', () => {
  it('listar pega al GET base y ordena por orden y fecha', async () => {
    get.mockResolvedValueOnce([
      medio({ id: 'b', orden: 1 }),
      medio({ id: 'a', orden: 0, createdAt: '2026-09-02T00:00:00Z' }),
      medio({ id: 'c', orden: 0, createdAt: '2026-09-01T00:00:00Z' }),
    ]);
    const r = await mediosDePagoApi.listar();
    expect(get).toHaveBeenCalledWith('/inmobiliaria/medios-de-pago');
    expect(r.map((m) => m.id)).toEqual(['c', 'a', 'b']);
  });

  it('crear hace POST con el cuerpo armado', async () => {
    post.mockResolvedValueOnce(medio());
    await mediosDePagoApi.crear({ tipo: 'EFECTIVO', nombre: 'Efectivo' });
    expect(post).toHaveBeenCalledWith('/inmobiliaria/medios-de-pago', { tipo: 'EFECTIVO', nombre: 'Efectivo' });
  });

  it('actualizar hace PUT /:id; desactivar hace DELETE /:id', async () => {
    put.mockResolvedValueOnce(medio());
    del.mockResolvedValueOnce(medio({ activo: false }));
    await mediosDePagoApi.actualizar('m1', { visibleAlInquilino: false });
    expect(put).toHaveBeenCalledWith('/inmobiliaria/medios-de-pago/m1', { visibleAlInquilino: false });
    await mediosDePagoApi.desactivar('m1');
    expect(del).toHaveBeenCalledWith('/inmobiliaria/medios-de-pago/m1');
  });

  it('reordenar hace PUT /orden con {items} y sólo id/orden', async () => {
    put.mockResolvedValueOnce([medio()]);
    await mediosDePagoApi.reordenar([{ id: 'm1', orden: 2 }]);
    expect(put).toHaveBeenCalledWith('/inmobiliaria/medios-de-pago/orden', { items: [{ id: 'm1', orden: 2 }] });
  });

  it('catalogo y para-inquilino pegan a sus rutas y toleran {data}', async () => {
    get.mockResolvedValueOnce({ data: [{ tipo: 'EFECTIVO', nombre: 'Efectivo' }] });
    expect(await mediosDePagoApi.catalogo()).toEqual([{ tipo: 'EFECTIVO', nombre: 'Efectivo' }]);
    expect(get).toHaveBeenCalledWith('/inmobiliaria/medios-de-pago/catalogo-de-medios');
    get.mockResolvedValueOnce([]);
    expect(await mediosDePagoApi.paraInquilino()).toEqual([]);
    expect(get).toHaveBeenCalledWith('/inmobiliaria/medios-de-pago/para-inquilino');
  });
});

describe('ordenarMedios', () => {
  it('no muta la lista original', () => {
    const lista = [medio({ id: 'b', orden: 1 }), medio({ id: 'a', orden: 0 })];
    ordenarMedios(lista);
    expect(lista[0].id).toBe('b');
  });
});
