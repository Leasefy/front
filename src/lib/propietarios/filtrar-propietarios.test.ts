/**
 * filtrar-propietarios.test.ts
 *
 * Lo que fija este archivo es que buscar mira TODA la lista. El defecto que lo
 * motivó no estaba acá sino en quién llamaba: la tabla filtraba las 10 filas
 * de la página actual, así que «Martínez» en la página 3 no existía para el
 * buscador. Con la función afuera, la página puede filtrar antes de paginar —
 * y estos casos fijan el contrato.
 */

import { describe, it, expect } from 'vitest';
import type { Propietario } from '@/lib/types/inmobiliaria';
import {
  FILTROS_INICIALES,
  conteosDePropietarios,
  filtrarPropietarios,
  hayFiltros,
} from './filtrar-propietarios';

function propietario(over: Partial<Propietario> & { name: string }): Propietario {
  return {
    id: over.name,
    email: null,
    phone: null,
    documentType: 'CC',
    documentNumber: '1',
    propertyCount: 0,
    activeLeases: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as Propietario;
}

const ANA = propietario({ name: 'Ana Gómez', email: 'ana@x.co', pendingBalance: 0 });
const BETO = propietario({ name: 'Beto Ruiz', phone: '3110000000', pendingBalance: 250000 });
const CONSTRUCTORA = propietario({
  name: 'Constructora Andes SAS',
  documentType: 'NIT',
  documentNumber: '900123456',
  totalMonthlyRent: 9_000_000,
});

describe('buscar', () => {
  it('encuentra por nombre, correo, documento y teléfono', () => {
    const lista = [ANA, BETO, CONSTRUCTORA];
    const busca = (q: string) =>
      filtrarPropietarios(lista, { ...FILTROS_INICIALES, busqueda: q }).map((p) => p.name);

    expect(busca('gómez')).toEqual(['Ana Gómez']);
    expect(busca('ana@x.co')).toEqual(['Ana Gómez']);
    expect(busca('900123456')).toEqual(['Constructora Andes SAS']);
    expect(busca('3110000000')).toEqual(['Beto Ruiz']);
  });

  it('no revienta con correo/teléfono/documento en null', () => {
    const sinNada = propietario({
      name: 'Sin datos',
      email: null,
      phone: null,
      documentNumber: null as unknown as string,
    });
    expect(() =>
      filtrarPropietarios([sinNada], { ...FILTROS_INICIALES, busqueda: 'x' }),
    ).not.toThrow();
  });

  it('no muta la lista que recibe', () => {
    const lista = [CONSTRUCTORA, ANA, BETO];
    const copia = [...lista];
    filtrarPropietarios(lista, { ...FILTROS_INICIALES, campo: 'name', sentido: 'desc' });
    expect(lista).toEqual(copia);
  });
});

describe('filtros', () => {
  it('«con saldo pendiente» deja sólo a los que deben', () => {
    const r = filtrarPropietarios([ANA, BETO, CONSTRUCTORA], {
      ...FILTROS_INICIALES,
      soloConSaldo: true,
    });
    expect(r.map((p) => p.name)).toEqual(['Beto Ruiz']);
  });

  it('empresa = NIT; persona = todo lo demás', () => {
    const empresas = filtrarPropietarios([ANA, BETO, CONSTRUCTORA], {
      ...FILTROS_INICIALES,
      tipo: 'company',
    });
    const personas = filtrarPropietarios([ANA, BETO, CONSTRUCTORA], {
      ...FILTROS_INICIALES,
      tipo: 'person',
    });
    expect(empresas.map((p) => p.name)).toEqual(['Constructora Andes SAS']);
    expect(personas.map((p) => p.name)).toEqual(['Ana Gómez', 'Beto Ruiz']);
  });

  it('el orden NO cuenta como filtro: no explica una lista más corta', () => {
    expect(hayFiltros({ ...FILTROS_INICIALES, campo: 'pendingBalance', sentido: 'desc' })).toBe(false);
    expect(hayFiltros({ ...FILTROS_INICIALES, busqueda: '  ' })).toBe(false);
    expect(hayFiltros({ ...FILTROS_INICIALES, busqueda: 'ana' })).toBe(true);
    expect(hayFiltros({ ...FILTROS_INICIALES, soloConSaldo: true })).toBe(true);
  });
});

describe('orden', () => {
  it('por canon descendente pone primero al más alto de TODA la lista', () => {
    const r = filtrarPropietarios([ANA, BETO, CONSTRUCTORA], {
      ...FILTROS_INICIALES,
      campo: 'totalMonthlyRent',
      sentido: 'desc',
    });
    expect(r[0].name).toBe('Constructora Andes SAS');
  });
});

describe('conteosDePropietarios · el número de cada chip', () => {
  const LISTA = [ANA, BETO, CONSTRUCTORA];

  it('cuenta personas y empresas, y el total', () => {
    expect(conteosDePropietarios(LISTA, FILTROS_INICIALES)).toEqual({
      todos: 3,
      persona: 2,
      empresa: 1,
      conSaldo: 1,
    });
  });

  it('🔴 el número de un chip es LO QUE VERÍAS al clickearlo: respeta la búsqueda', () => {
    const conteos = conteosDePropietarios(LISTA, {
      ...FILTROS_INICIALES,
      busqueda: 'constructora',
    });
    expect(conteos).toEqual({ todos: 1, persona: 0, empresa: 1, conSaldo: 0 });

    // Y cuadra: clickear «Persona» con esa búsqueda deja la lista vacía.
    expect(
      filtrarPropietarios(LISTA, {
        ...FILTROS_INICIALES,
        busqueda: 'constructora',
        tipo: 'person',
      }),
    ).toHaveLength(conteos.persona);
  });

  it('🔴 el chip del saldo no depende de sí mismo: cuenta igual prendido o apagado', () => {
    const apagado = conteosDePropietarios(LISTA, { ...FILTROS_INICIALES, soloConSaldo: false });
    const prendido = conteosDePropietarios(LISTA, { ...FILTROS_INICIALES, soloConSaldo: true });
    expect(apagado.conSaldo).toBe(1);
    expect(prendido.conSaldo).toBe(1);
  });

  it('con el saldo puesto, los chips de tipo cuentan DENTRO de ese filtro', () => {
    /*
     * Es la parte que hace que el número cuadre: con «Con saldo» prendido,
     * «Persona» dice 1 —Beto— y no 2, porque al clickearlo se ve uno solo.
     */
    const conteos = conteosDePropietarios(LISTA, { ...FILTROS_INICIALES, soloConSaldo: true });
    expect(conteos).toEqual({ todos: 1, persona: 1, empresa: 0, conSaldo: 1 });
  });

  it('un cero es una respuesta, no un hueco', () => {
    expect(conteosDePropietarios([ANA], FILTROS_INICIALES).empresa).toBe(0);
  });
});
