/**
 * reglas-de-mora.service — el contrato con el back, clave por clave.
 *
 * El back corre con `forbidNonWhitelisted`: una clave de más es un 400. Por
 * eso estos tests fijan el juego EXACTO de claves de cada cuerpo, no sólo que
 * «se llame al endpoint».
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

import { normalizarRegla, ordenarReglas, reglasDeMoraApi } from './reglas-de-mora.service';
import type { ReglaDeMoraCruda } from './reglas-de-mora.types';

const BASE = '/inmobiliaria/reglas-de-mora';

function cruda(sobre: Partial<ReglaDeMoraCruda> = {}): ReglaDeMoraCruda {
  return {
    id: 'r-1',
    agencyId: 'a-1',
    nombre: 'Interés de mora',
    concepto: 'INTERES_DE_MORA',
    disparador: 'DIAS_DE_MORA',
    disparadorDia: 1,
    formula: 'INTERES_DIARIO',
    valor: '0.0667',
    base: 'CANON',
    topeCop: null,
    activa: true,
    orden: 0,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...sobre,
  };
}

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  deleteMock.mockReset();
});

describe('normalizarRegla', () => {
  it('convierte el Decimal que viaja como string a número', () => {
    expect(normalizarRegla(cruda({ valor: '0.0667' })).valor).toBe(0.0667);
    expect(normalizarRegla(cruda({ valor: 10 })).valor).toBe(10);
  });

  it('un tope ausente queda como null, no undefined', () => {
    const sin = cruda();
    delete (sin as { topeCop?: number | null }).topeCop;
    expect(normalizarRegla(sin).topeCop).toBeNull();
    expect(normalizarRegla(cruda({ topeCop: 500000 })).topeCop).toBe(500000);
  });
});

describe('ordenarReglas', () => {
  it('ordena por orden y, a igual orden, por creación', () => {
    const a = normalizarRegla(cruda({ id: 'a', orden: 1, createdAt: '2026-01-02' }));
    const b = normalizarRegla(cruda({ id: 'b', orden: 0, createdAt: '2026-01-03' }));
    const c = normalizarRegla(cruda({ id: 'c', orden: 1, createdAt: '2026-01-01' }));
    expect(ordenarReglas([a, b, c]).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('reglasDeMoraApi.listar', () => {
  it('pide GET al recurso y devuelve las reglas normalizadas y ordenadas', async () => {
    getMock.mockResolvedValueOnce([
      cruda({ id: 'b', orden: 1, valor: '10' }),
      cruda({ id: 'a', orden: 0 }),
    ]);
    const reglas = await reglasDeMoraApi.listar();
    expect(getMock).toHaveBeenCalledWith(BASE);
    expect(reglas.map((r) => r.id)).toEqual(['a', 'b']);
    expect(reglas[1].valor).toBe(10);
  });

  it('tolera la envoltura { data }', async () => {
    getMock.mockResolvedValueOnce({ data: [cruda()] });
    expect(await reglasDeMoraApi.listar()).toHaveLength(1);
  });

  it('una respuesta vacía es una lista vacía', async () => {
    getMock.mockResolvedValueOnce(null);
    expect(await reglasDeMoraApi.listar()).toEqual([]);
  });
});

describe('reglasDeMoraApi.crear', () => {
  it('manda POST con exactamente las claves del DTO (sin tope ni opcionales ausentes)', async () => {
    postMock.mockResolvedValueOnce(cruda());
    await reglasDeMoraApi.crear({
      nombre: '  Interés de mora  ',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'INTERES_DIARIO',
      valor: 0.0667,
      base: 'CANON',
    });
    expect(postMock).toHaveBeenCalledTimes(1);
    const [ruta, cuerpo] = postMock.mock.calls[0];
    expect(ruta).toBe(BASE);
    expect(cuerpo).toEqual({
      nombre: 'Interés de mora',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'INTERES_DIARIO',
      valor: 0.0667,
      base: 'CANON',
    });
    expect(Object.keys(cuerpo as object).sort()).toEqual(
      ['base', 'concepto', 'disparador', 'disparadorDia', 'formula', 'nombre', 'valor'].sort(),
    );
  });

  it('un tope null NO viaja en la creación; uno con valor sí, junto con activa y orden', async () => {
    postMock.mockResolvedValueOnce(cruda());
    await reglasDeMoraApi.crear({
      nombre: 'Gasto administrativo',
      concepto: 'GASTO_ADMINISTRATIVO',
      disparador: 'DIA_DEL_MES',
      disparadorDia: 15,
      formula: 'PORCENTAJE_DE_LA_BASE',
      valor: 10,
      base: 'CANON',
      topeCop: null,
      activa: false,
      orden: 1,
    });
    expect(postMock.mock.calls[0][1]).toEqual({
      nombre: 'Gasto administrativo',
      concepto: 'GASTO_ADMINISTRATIVO',
      disparador: 'DIA_DEL_MES',
      disparadorDia: 15,
      formula: 'PORCENTAJE_DE_LA_BASE',
      valor: 10,
      base: 'CANON',
      activa: false,
      orden: 1,
    });

    postMock.mockResolvedValueOnce(cruda());
    await reglasDeMoraApi.crear({
      nombre: 'Con tope',
      concepto: 'AJUSTE_MANUAL',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 30,
      formula: 'MONTO_FIJO',
      valor: 50000,
      base: 'CANON',
      topeCop: 500000,
    });
    expect(postMock.mock.calls[1][1]).toMatchObject({ topeCop: 500000 });
  });

  it('el valor se manda como número, nunca como texto', async () => {
    postMock.mockResolvedValueOnce(cruda());
    await reglasDeMoraApi.crear({
      nombre: 'Interés',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'INTERES_DIARIO',
      valor: 0.0667,
      base: 'CANON',
    });
    expect(typeof (postMock.mock.calls[0][1] as { valor: unknown }).valor).toBe('number');
  });

  it('devuelve la regla creada ya normalizada', async () => {
    postMock.mockResolvedValueOnce(cruda({ valor: '2.5' }));
    const regla = await reglasDeMoraApi.crear({
      nombre: 'Interés',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'PORCENTAJE_DE_LA_BASE',
      valor: 2.5,
      base: 'CANON',
    });
    expect(regla.valor).toBe(2.5);
  });
});

describe('reglasDeMoraApi.actualizar', () => {
  it('manda PUT a /:id sólo con las claves que cambian', async () => {
    putMock.mockResolvedValueOnce(cruda({ activa: false }));
    await reglasDeMoraApi.actualizar('r-1', { activa: false });
    expect(putMock).toHaveBeenCalledWith(`${BASE}/r-1`, { activa: false });
  });

  it('topeCop: null SÍ viaja, porque es la manera de quitar el tope', async () => {
    putMock.mockResolvedValueOnce(cruda());
    await reglasDeMoraApi.actualizar('r-1', { topeCop: null, nombre: ' Nuevo ' });
    expect(putMock.mock.calls[0][1]).toEqual({ nombre: 'Nuevo', topeCop: null });
  });

  it('un cuerpo completo lleva exactamente las diez claves del DTO', async () => {
    putMock.mockResolvedValueOnce(cruda());
    await reglasDeMoraApi.actualizar('r-1', {
      nombre: 'Interés',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 3,
      formula: 'INTERES_DIARIO',
      valor: 0.05,
      base: 'CANON_MAS_ADMINISTRACION',
      topeCop: 100000,
      activa: true,
      orden: 2,
    });
    expect(Object.keys(putMock.mock.calls[0][1] as object).sort()).toEqual(
      [
        'activa',
        'base',
        'concepto',
        'disparador',
        'disparadorDia',
        'formula',
        'nombre',
        'orden',
        'topeCop',
        'valor',
      ].sort(),
    );
  });
});

describe('reglasDeMoraApi.desactivar / obtener', () => {
  it('desactivar manda DELETE a /:id y devuelve la regla apagada', async () => {
    deleteMock.mockResolvedValueOnce(cruda({ activa: false }));
    const regla = await reglasDeMoraApi.desactivar('r-1');
    expect(deleteMock).toHaveBeenCalledWith(`${BASE}/r-1`);
    expect(regla.activa).toBe(false);
  });

  it('obtener pide GET a /:id', async () => {
    getMock.mockResolvedValueOnce(cruda({ valor: '10' }));
    const regla = await reglasDeMoraApi.obtener('r-1');
    expect(getMock).toHaveBeenCalledWith(`${BASE}/r-1`);
    expect(regla.valor).toBe(10);
  });
});
