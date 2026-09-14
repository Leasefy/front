import { describe, it, expect } from 'vitest';
import type { Contract } from '@/lib/types/contract';
import {
  filtrarContratos,
  hayFiltros,
  cuantosFiltros,
  FILTROS_INICIALES,
  DIAS_POR_VENCER,
  type FiltrosDeContratos,
} from './filtrar-contratos';

/**
 * 🔴 Nico, 2026-09-12: «esta tabla ¿por qué no tiene buscador?» y, la misma
 * noche, «con TODOS los filtros». Con 1.836 contratos paginados de a 10,
 * encontrar uno era pasar 184 páginas. Se filtra sobre la lista completa;
 * paginar es cosa de la pantalla.
 */

const HOY = new Date(2026, 8, 12); // 12 de septiembre de 2026

function contrato(overrides: Partial<Contract>): Partial<Contract> {
  return {
    id: 'c',
    code: 1,
    externalId: null,
    status: 'active',
    contractOrigin: 'GENERATED',
    propertyId: 'p-1',
    tenantId: 't-1',
    tenantName: 'Ana Díaz',
    propertyAddress: 'Cra 76 # 32-11',
    propertyCity: 'Medellín',
    monthlyRent: 1_500_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ...overrides,
  };
}

function con(parcial: Partial<FiltrosDeContratos>): FiltrosDeContratos {
  return { ...FILTROS_INICIALES, ...parcial };
}

const ids = (r: Partial<Contract>[]) => r.map((c) => c.id);

describe('filtrarContratos — la búsqueda', () => {
  const lista = [
    contrato({ id: 'a', code: 1981, tenantName: 'Carlos Martínez', propertyAddress: 'Calle 10 # 5-20', propertyCity: 'Bogotá' }),
    contrato({ id: 'b', code: 1839, externalId: '1686', tenantName: 'Nubia Amparo David', contractOrigin: 'MIGRATED' }),
    contrato({ id: 'c', code: 3, tenantName: 'Ana Díaz' }),
  ];

  it('sin nada escrito devuelve todo, en el mismo orden', () => {
    expect(ids(filtrarContratos(lista, FILTROS_INICIALES))).toEqual(['a', 'b', 'c']);
  });

  it('busca por inquilino sin importar acentos ni mayúsculas', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: 'martinez' })))).toEqual(['a']);
    expect(ids(filtrarContratos(lista, con({ busqueda: 'DÍAZ' })))).toEqual(['c']);
  });

  it('busca por dirección y por ciudad', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: 'calle 10' })))).toEqual(['a']);
    expect(ids(filtrarContratos(lista, con({ busqueda: 'bogota' })))).toEqual(['a']);
  });

  it('busca por nuestro código, con o sin numeral', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: '#1981' })))).toEqual(['a']);
    expect(ids(filtrarContratos(lista, con({ busqueda: '1981' })))).toEqual(['a']);
  });

  it('🔴 busca por el número de la inmobiliaria: «1686» encuentra al migrado que en Leasefy es #1839', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: '1686' })))).toEqual(['b']);
    expect(ids(filtrarContratos(lista, con({ busqueda: '#1686' })))).toEqual(['b']);
    // Y el nuestro sigue encontrándolo: los dos números son del mismo contrato.
    expect(ids(filtrarContratos(lista, con({ busqueda: '1839' })))).toEqual(['b']);
  });

  it('un contrato sin código ni inquilino no revienta la búsqueda', () => {
    const sinNada = [contrato({ id: 'x', code: undefined, tenantName: undefined, propertyAddress: undefined, propertyCity: undefined })];
    expect(filtrarContratos(sinNada, con({ busqueda: '1' }))).toEqual([]);
  });
});

describe('filtrarContratos — estado', () => {
  const lista = [
    contrato({ id: 'activo', status: 'active' }),
    contrato({ id: 'borrador', status: 'draft' }),
    contrato({ id: 'cancelado', status: 'cancelled' }),
  ];

  it('deja sólo el estado elegido', () => {
    expect(ids(filtrarContratos(lista, con({ estado: 'draft' })))).toEqual(['borrador']);
  });
});

describe('filtrarContratos — vigencia por FECHAS, no por estado', () => {
  const lista = [
    contrato({ id: 'vigente', endDate: '2027-06-30' }),
    contrato({ id: 'por-vencer', endDate: '2026-10-31' }),
    contrato({ id: 'vence-hoy', endDate: '2026-09-12' }),
    contrato({ id: 'vencido', endDate: '2026-09-11', status: 'active' }),
    contrato({ id: 'sin-fecha', endDate: null }),
  ];

  it('vigente = todavía no venció (incluye el que vence hoy)', () => {
    expect(ids(filtrarContratos(lista, con({ vigencia: 'vigente' }), HOY))).toEqual([
      'vigente',
      'por-vencer',
      'vence-hoy',
    ]);
  });

  it(`por vencer = vence dentro de ${DIAS_POR_VENCER} días (el aviso de la Ley 820)`, () => {
    expect(ids(filtrarContratos(lista, con({ vigencia: 'por_vencer' }), HOY))).toEqual([
      'por-vencer',
      'vence-hoy',
    ]);
  });

  it('vencido = la fecha de fin ya pasó, aunque el estado siga «activo» (un migrado entra así)', () => {
    expect(ids(filtrarContratos(lista, con({ vigencia: 'vencido' }), HOY))).toEqual(['vencido']);
  });

  it('sin fechas = no trae fecha de fin', () => {
    expect(ids(filtrarContratos(lista, con({ vigencia: 'sin_fechas' }), HOY))).toEqual(['sin-fecha']);
  });
});

describe('filtrarContratos — con/sin inmueble e inquilino (null es «no tiene»)', () => {
  const lista = [
    contrato({ id: 'completo' }),
    contrato({ id: 'sin-inmueble', propertyId: null }),
    contrato({ id: 'sin-inquilino', tenantId: null }),
  ];

  it('inmueble', () => {
    expect(ids(filtrarContratos(lista, con({ inmueble: 'sin' })))).toEqual(['sin-inmueble']);
    expect(ids(filtrarContratos(lista, con({ inmueble: 'con' })))).toEqual(['completo', 'sin-inquilino']);
  });

  it('inquilino', () => {
    expect(ids(filtrarContratos(lista, con({ inquilino: 'sin' })))).toEqual(['sin-inquilino']);
    expect(ids(filtrarContratos(lista, con({ inquilino: 'con' })))).toEqual(['completo', 'sin-inmueble']);
  });

  it('si el back no mandó el dato (undefined) no se afirma ni una cosa ni la otra', () => {
    const sinDato = [contrato({ id: 'x', propertyId: undefined })];
    expect(ids(filtrarContratos(sinDato, con({ inmueble: 'con' })))).toEqual(['x']);
    expect(ids(filtrarContratos(sinDato, con({ inmueble: 'sin' })))).toEqual(['x']);
  });
});

describe('filtrarContratos — migrado / nativo y canon', () => {
  const lista = [
    contrato({ id: 'migrado', contractOrigin: 'MIGRATED', monthlyRent: null }),
    contrato({ id: 'barato', monthlyRent: 800_000 }),
    contrato({ id: 'medio', monthlyRent: 1_500_000 }),
    contrato({ id: 'caro', monthlyRent: 3_000_000 }),
    contrato({ id: 'carisimo', monthlyRent: 8_000_000 }),
  ];

  it('origen', () => {
    expect(ids(filtrarContratos(lista, con({ origen: 'migrado' })))).toEqual(['migrado']);
    expect(ids(filtrarContratos(lista, con({ origen: 'nativo' })))).toHaveLength(4);
  });

  it('bandas de canon, y «sin canon» para el migrado sin el dato — nunca lo cuenta como $0', () => {
    expect(ids(filtrarContratos(lista, con({ canon: 'hasta_1m' })))).toEqual(['barato']);
    expect(ids(filtrarContratos(lista, con({ canon: '1m_2m' })))).toEqual(['medio']);
    expect(ids(filtrarContratos(lista, con({ canon: '2m_5m' })))).toEqual(['caro']);
    expect(ids(filtrarContratos(lista, con({ canon: 'mas_5m' })))).toEqual(['carisimo']);
    expect(ids(filtrarContratos(lista, con({ canon: 'sin_canon' })))).toEqual(['migrado']);
  });

  it('los filtros se combinan (Y, no O)', () => {
    expect(ids(filtrarContratos(lista, con({ origen: 'nativo', canon: 'mas_5m', busqueda: 'ana' })))).toEqual(['carisimo']);
  });
});

describe('filtrarContratos — el orden', () => {
  const lista = [
    contrato({ id: 'b', code: 2, tenantName: 'Beatriz', monthlyRent: 2_000_000, endDate: '2026-12-31' }),
    contrato({ id: 'sin', code: 4, tenantName: 'Zoe', monthlyRent: null, endDate: null }),
    contrato({ id: 'a', code: 1, tenantName: 'Álvaro', monthlyRent: 3_000_000, endDate: '2026-10-01' }),
    contrato({ id: 'ext', code: 3, externalId: '1686', tenantName: 'Carla', monthlyRent: 1_000_000, endDate: '2027-01-15' }),
  ];

  it('sin campo conserva el orden del back', () => {
    expect(ids(filtrarContratos(lista, FILTROS_INICIALES))).toEqual(['b', 'sin', 'a', 'ext']);
  });

  it('por inquilino, alfabético y sin que la tilde mande a Álvaro al final', () => {
    expect(ids(filtrarContratos(lista, con({ campo: 'tenantName', sentido: 'asc' })))).toEqual(['a', 'b', 'ext', 'sin']);
    expect(ids(filtrarContratos(lista, con({ campo: 'tenantName', sentido: 'desc' })))).toEqual(['sin', 'ext', 'b', 'a']);
  });

  it('por canon, y el «sin canon» va al final en los DOS sentidos', () => {
    expect(ids(filtrarContratos(lista, con({ campo: 'monthlyRent', sentido: 'asc' })))).toEqual(['ext', 'b', 'a', 'sin']);
    expect(ids(filtrarContratos(lista, con({ campo: 'monthlyRent', sentido: 'desc' })))).toEqual(['a', 'b', 'ext', 'sin']);
  });

  it('por fecha de fin, y el «sin fecha» va al final en los DOS sentidos', () => {
    expect(ids(filtrarContratos(lista, con({ campo: 'endDate', sentido: 'asc' })))).toEqual(['a', 'b', 'ext', 'sin']);
    expect(ids(filtrarContratos(lista, con({ campo: 'endDate', sentido: 'desc' })))).toEqual(['ext', 'b', 'a', 'sin']);
  });

  it('por número ordena por el que se LEE: el de la inmobiliaria si lo hay', () => {
    // ext se lee «1686», mucho más grande que los #1, #2 y #4 de los demás.
    expect(ids(filtrarContratos(lista, con({ campo: 'numero', sentido: 'asc' })))).toEqual(['a', 'b', 'sin', 'ext']);
  });
});

describe('hayFiltros / cuantosFiltros', () => {
  it('el orden no cuenta como filtro; la búsqueda cuenta pero no suma al conteo', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ campo: 'numero', sentido: 'desc' }))).toBe(false);
    expect(hayFiltros(con({ busqueda: 'ana' }))).toBe(true);
    expect(cuantosFiltros(con({ busqueda: 'ana' }))).toBe(0);
    expect(cuantosFiltros(con({ estado: 'active', canon: 'mas_5m' }))).toBe(2);
  });
});
