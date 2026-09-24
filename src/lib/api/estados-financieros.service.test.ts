/**
 * estados-financieros.service — la ruta y el query exactos de los cuatro
 * informes.
 *
 * Lo que se congela acá es lo que el back valida y no perdona: `mes` en el P&G
 * y `hasta` en el balance son obligatorios; los booleanos viajan como TEXTO
 * (los DTO son `@IsBooleanString`, un `true` real es 400); `comparar` es una
 * lista separada por comas en un solo parámetro, no `comparar=a&comparar=b`; y
 * el límite de terceros se recorta al tope del DTO acá, para que un «ver 500»
 * de la pantalla no se convierta en un 400 del back.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { clienteMock } = vi.hoisted(() => ({
  clienteMock: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

vi.mock('./client', () => ({ apiClient: clienteMock }));

import {
  estadosFinancierosApi,
  MAX_LIMITE_DE_TERCEROS,
  NIVELES_DEL_MAYOR,
  COMPARACIONES,
} from './estados-financieros.service';

const BASE = '/inmobiliaria/contabilidad/reportes';

const query = (i = 0) => {
  const url = new URL(clienteMock.get.mock.calls[i][0], 'http://x');
  return { path: url.pathname, params: Object.fromEntries(url.searchParams) };
};

beforeEach(() => {
  clienteMock.get.mockReset().mockResolvedValue({});
});

describe('pyg', () => {
  it('el mes va siempre: un P&G sin período no existe', async () => {
    await estadosFinancierosApi.pyg({ mes: '2026-09' });
    expect(query()).toEqual({ path: `${BASE}/pyg`, params: { mes: '2026-09' } });
  });

  it('`acumulado` viaja como texto (el DTO es @IsBooleanString)', async () => {
    await estadosFinancierosApi.pyg({ mes: '2026-09', acumulado: false });
    expect(query().params.acumulado).toBe('false');
  });

  it('`comparar` es UNA clave con las dos opciones separadas por coma', async () => {
    await estadosFinancierosApi.pyg({
      mes: '2026-09',
      comparar: ['presupuesto', 'anioAnterior'],
    });
    expect(query().params.comparar).toBe('presupuesto,anioAnterior');
  });

  it('una lista de comparaciones vacía no manda la clave', async () => {
    await estadosFinancierosApi.pyg({ mes: '2026-09', comparar: [] });
    expect(query().params).toEqual({ mes: '2026-09' });
  });

  it('la sede vacía es consolidado: no manda la clave', async () => {
    await estadosFinancierosApi.pyg({ mes: '2026-09', sedeId: '' });
    expect(query().params).toEqual({ mes: '2026-09' });
  });
});

describe('balanceGeneral', () => {
  it('`hasta` es obligatorio y va como día', async () => {
    await estadosFinancierosApi.balanceGeneral({ hasta: '2026-09-30' });
    expect(query()).toEqual({ path: `${BASE}/balance-general`, params: { hasta: '2026-09-30' } });
  });

  it('el comparativo del año anterior viaja como texto', async () => {
    await estadosFinancierosApi.balanceGeneral({ hasta: '2026-09-30', comparativo: true });
    expect(query().params).toEqual({ hasta: '2026-09-30', comparativo: 'true' });
  });
});

describe('mayor', () => {
  it('sin filtros pega a la ruta pelada', async () => {
    await estadosFinancierosApi.mayor();
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/mayor`);
  });

  it('manda rango, nivel, sede y clase', async () => {
    await estadosFinancierosApi.mayor({
      desde: '2026-01-01',
      hasta: '2026-09-30',
      nivel: 'hoja',
      sedeId: 's1',
      clase: '5',
    });
    expect(query()).toEqual({
      path: `${BASE}/mayor`,
      params: {
        desde: '2026-01-01',
        hasta: '2026-09-30',
        nivel: 'hoja',
        sedeId: 's1',
        clase: '5',
      },
    });
  });

  it('los niveles son los cinco del contrato, sin repetidos', () => {
    expect([...NIVELES_DEL_MAYOR]).toEqual(['1', '2', '4', '6', 'hoja']);
    expect(new Set(NIVELES_DEL_MAYOR).size).toBe(NIVELES_DEL_MAYOR.length);
  });
});

describe('terceros', () => {
  it('`conSaldo` viaja como texto', async () => {
    await estadosFinancierosApi.terceros({ conSaldo: true });
    expect(query().params).toEqual({ conSaldo: 'true' });
  });

  it('recorta el límite al tope del DTO', async () => {
    await estadosFinancierosApi.terceros({ limite: 9_999 });
    expect(query().params.limite).toBe(String(MAX_LIMITE_DE_TERCEROS));
  });

  it('manda cuenta y tipo de tercero tal como se asentaron', async () => {
    await estadosFinancierosApi.terceros({ cuentaId: 'c1', terceroTipo: 'PROPIETARIO' });
    expect(query().params).toEqual({ cuentaId: 'c1', terceroTipo: 'PROPIETARIO' });
  });

  it('el desplazamiento 0 SÍ viaja: es una página válida, no un vacío', async () => {
    await estadosFinancierosApi.terceros({ desplazamiento: 0 });
    expect(query().params.desplazamiento).toBe('0');
  });
});

describe('las comparaciones del P&G', () => {
  it('son las dos del contrato', () => {
    expect([...COMPARACIONES]).toEqual(['presupuesto', 'anioAnterior']);
  });
});
