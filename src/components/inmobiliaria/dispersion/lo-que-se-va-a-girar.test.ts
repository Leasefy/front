/**
 * Los bordes de la cuenta que la pantalla no puede mostrar fácil.
 *
 * Lo demás —marcar, destildar, buscar, confirmar— se prueba por comportamiento
 * en `GenerarDispersion.test.tsx`. Acá quedan los dos casos que, si se rompen,
 * se pierde plata en silencio y ninguna pantalla lo cuenta.
 */
import { describe, it, expect } from 'vitest';

import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';
import {
  elTotalDeLaCorrida,
  elTotalDelPropietario,
  entraEnLaCorrida,
  inmueblesDelPropietario,
  loQueViajaAlBack,
  renglonesDentro,
} from './lo-que-se-va-a-girar';

type Propietario = VistaPreviaDeDispersiones['propietarios'][number];

function renglon(propertyId: string | null, titulo: string, neto: number) {
  return {
    cobroId: null,
    cuotaId: `c-${titulo}`,
    propertyId,
    propertyTitle: titulo,
    rentCollected: neto,
    commissionPercent: 0,
    commissionAmount: 0,
    netAmount: neto,
    conceptosAFavor: 0,
    conceptosACargo: 0,
    deTerceros: 0,
  };
}

function propietario(items: Propietario['items']): Propietario {
  return {
    propietarioId: 'p-1',
    propietarioName: 'Jorge',
    propietarioBankName: null,
    propietarioBankAccount: null,
    yaExiste: false,
    totalCollected: items.reduce((s, i) => s + i.rentCollected, 0),
    totalCommission: 0,
    totalConceptosAFavor: 0,
    totalConceptosACargo: 0,
    totalDeTerceros: 0,
    netToPropietario: items.reduce((s, i) => s + i.netAmount, 0),
    items,
  };
}

function previa(propietarios: Propietario[]): VistaPreviaDeDispersiones {
  return {
    month: '2026-08',
    totalPropietarios: propietarios.length,
    yaGenerados: 0,
    totalAGirar: propietarios.reduce((s, p) => s + p.netToPropietario, 0),
    totalComisiones: 0,
    propietarios,
  };
}

describe('un renglón sin inmueble entra siempre', () => {
  /*
   * 🔴 Los intereses de mora que le tocan al propietario por su mandato (D2) no
   * salen de una cuota y no traen inmueble: no se pueden nombrar en la lista, así
   * que no se pueden destildar. Si el filtro los dejara afuera «por no estar
   * seleccionados», destildar cualquier inmueble se le comería los intereses de
   * ese dueño sin decirlo. El back hace exactamente lo mismo.
   */
  it('destildar todos los inmuebles NO se lleva el renglón sin inmueble', () => {
    const p = propietario([
      renglon('inm-1', 'Casa 1', 900_000),
      renglon(null, 'Intereses de mora', 50_000),
    ]);

    const quedan = renglonesDentro(p.items, new Set(['inm-1']));

    expect(quedan).toHaveLength(1);
    expect(quedan[0].propertyTitle).toBe('Intereses de mora');
    // Y por eso el propietario sigue en la corrida: tiene algo que girar.
    expect(
      entraEnLaCorrida(p, {
        propietariosFuera: new Set(),
        inmueblesFuera: new Set(['inm-1']),
      }),
    ).toBe(true);
  });

  it('no aparece como un inmueble destildable', () => {
    const p = propietario([
      renglon('inm-1', 'Casa 1', 900_000),
      renglon(null, 'Intereses de mora', 50_000),
    ]);

    expect(inmueblesDelPropietario(p).map((i) => i.titulo)).toEqual(['Casa 1']);
  });

  it('un mismo inmueble con dos renglones se lista una sola vez', () => {
    const p = propietario([
      renglon('inm-1', 'Casa 1', 900_000),
      renglon('inm-1', 'Casa 1', 100_000),
    ]);

    expect(inmueblesDelPropietario(p)).toHaveLength(1);
  });
});

describe('lo que viaja al back', () => {
  it('sin nada destildado no manda listas: el mes entero', () => {
    const p = propietario([renglon('inm-1', 'Casa 1', 900_000)]);

    expect(
      loQueViajaAlBack(previa([p]), {
        propietariosFuera: new Set(),
        inmueblesFuera: new Set(),
      }),
    ).toEqual({});
  });

  /*
   * 🔴 Con todos destildados la lista va VACÍA, y el back la entiende como
   * «ninguno». Es la misma trampa que ya se pagó allá: un `?.length` mandaba el
   * `[]` al else y se generaba el mes entero — el error más caro posible.
   */
  it('con todos destildados manda una lista vacía, no ninguna lista', () => {
    const p = propietario([renglon('inm-1', 'Casa 1', 900_000)]);

    expect(
      loQueViajaAlBack(previa([p]), {
        propietariosFuera: new Set(['p-1']),
        inmueblesFuera: new Set(),
      }),
    ).toEqual({ propietarioIds: [] });
  });

  it('con un inmueble destildado manda los que quedaron, sin repetir', () => {
    const p = propietario([
      renglon('inm-1', 'Casa 1', 900_000),
      renglon('inm-1', 'Casa 1', 100_000),
      renglon('inm-2', 'Casa 2', 500_000),
    ]);

    expect(
      loQueViajaAlBack(previa([p]), {
        propietariosFuera: new Set(),
        inmueblesFuera: new Set(['inm-2']),
      }),
    ).toEqual({ propietarioIds: ['p-1'], propertyIds: ['inm-1'] });
  });
});

describe('los montos sin la cuenta del back son provisionales', () => {
  it('con la selección completa son exactos: ya vinieron del back', () => {
    const p = propietario([renglon('inm-1', 'Casa 1', 900_000)]);

    const total = elTotalDeLaCorrida({
      previa: previa([p]),
      ajustada: null,
      seleccion: { propietariosFuera: new Set(), inmueblesFuera: new Set() },
    });

    expect(total.exacto).toBe(true);
    expect(total.aGirarCop).toBe(900_000);
  });

  /*
   * Con algo destildado y sin la previa de esa selección, la suma de los
   * renglones sirve para no dejar la barra en blanco — pero se marca provisional,
   * y con `exacto: false` la pantalla apaga el botón de confirmar. El neto puede
   * cambiar: las deducciones del propietario se aplican sobre la base que quede.
   */
  it('con algo destildado y sin respuesta del back, NO son exactos', () => {
    const p = propietario([
      renglon('inm-1', 'Casa 1', 900_000),
      renglon('inm-2', 'Casa 2', 500_000),
    ]);

    const total = elTotalDeLaCorrida({
      previa: previa([p]),
      ajustada: null,
      seleccion: { propietariosFuera: new Set(), inmueblesFuera: new Set(['inm-2']) },
    });

    expect(total.exacto).toBe(false);
    expect(total.aGirarCop).toBe(900_000);
  });
});

const NADA = { propietariosFuera: new Set<string>(), inmueblesFuera: new Set<string>() };

describe('la tarjeta del propietario con deducciones', () => {
  /*
   * 🔴 QA 22-09: deducción de 2.000.000 sobre un neto de 1.288.000. La tarjeta
   * decía «$-712.000» (el netToPropietario crudo) mientras el total de abajo
   * decía «A girar $0». Se gira $0 y 712.000 pasan al mes siguiente.
   */
  it('lo que se gira es aGirarCop, no un neto negativo; y dice lo descontado y lo que pasa', () => {
    const p: Propietario = {
      ...propietario([renglon('inm-1', 'Casa 1', 1_288_000)]),
      netToPropietario: -712_000,
      conDeducciones: {
        netoDelMesCop: 1_288_000,
        deducciones: [],
        deduccionesCop: 2_000_000,
        saldoAnteriorCop: 0,
        netoCop: -712_000,
        aGirarCop: 0,
        saldoEnContraCop: 712_000,
        compensadoCop: 1_288_000,
        renglones: [],
      },
    };
    const n = elTotalDelPropietario({ p, ajustada: null, seleccion: NADA });
    expect(n.netoCop).toBe(0);
    expect(n.deduccionesCop).toBe(2_000_000);
    expect(n.enContraCop).toBe(712_000);
  });
});
