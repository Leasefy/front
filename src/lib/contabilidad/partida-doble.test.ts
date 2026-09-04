import { describe, it, expect } from 'vitest';

import { MAX_COP_POR_MOVIMIENTO } from '@/lib/api/contabilidad.service';
import {
  lineaVacia,
  totalesDe,
  validarPartidaDoble,
  type LineaDelFormulario,
} from './partida-doble';

function linea(parte: Partial<LineaDelFormulario> & { clave: string }): LineaDelFormulario {
  return { ...lineaVacia(parte.clave), ...parte };
}

describe('validarPartidaDoble', () => {
  it('cuadra: dos líneas, débito = crédito', () => {
    const v = validarPartidaDoble([
      linea({ clave: 'a', cuentaId: 'c1', debitoCop: 1_500_000 }),
      linea({ clave: 'b', cuentaId: 'c2', creditoCop: 1_500_000 }),
    ]);
    expect(v.valido).toBe(true);
    expect(v.totales).toEqual({ debitos: 1_500_000, creditos: 1_500_000, diferencia: 0 });
    expect(v.generales).toEqual([]);
    expect(v.porLinea).toEqual({});
  });

  it('no cuadra: la diferencia se reporta con signo (débitos − créditos)', () => {
    const v = validarPartidaDoble([
      linea({ clave: 'a', cuentaId: 'c1', debitoCop: 1_500_000 }),
      linea({ clave: 'b', cuentaId: 'c2', creditoCop: 1_200_000 }),
    ]);
    expect(v.valido).toBe(false);
    expect(v.totales.diferencia).toBe(300_000);
    expect(v.generales).toContain('DESCUADRADO');
  });

  it('línea vacía: sin cuenta y sin monto se marca por línea', () => {
    const v = validarPartidaDoble([
      linea({ clave: 'a', cuentaId: 'c1', debitoCop: 100 }),
      linea({ clave: 'b', cuentaId: 'c2', creditoCop: 100 }),
      lineaVacia('vacia'),
    ]);
    expect(v.valido).toBe(false);
    expect(v.porLinea).toEqual({ vacia: 'SIN_CUENTA' });
    // Los totales de las líneas buenas no se contaminan por la vacía.
    expect(v.totales.diferencia).toBe(0);
    expect(v.generales).toEqual([]);
  });

  it('con cuenta pero sin monto es SIN_MONTO', () => {
    const v = validarPartidaDoble([
      linea({ clave: 'a', cuentaId: 'c1', debitoCop: 100 }),
      linea({ clave: 'b', cuentaId: 'c2' }),
    ]);
    expect(v.porLinea.b).toBe('SIN_MONTO');
    expect(v.valido).toBe(false);
  });

  it('una línea con los dos lados es DOS_LADOS', () => {
    const v = validarPartidaDoble([
      linea({ clave: 'a', cuentaId: 'c1', debitoCop: 100, creditoCop: 100 }),
      linea({ clave: 'b', cuentaId: 'c2', creditoCop: 100 }),
    ]);
    expect(v.porLinea.a).toBe('DOS_LADOS');
  });

  it('menos de dos líneas nunca vale, aunque «cuadre» en cero', () => {
    const v = validarPartidaDoble([linea({ clave: 'a', cuentaId: 'c1', debitoCop: 100 })]);
    expect(v.generales).toContain('MUY_POCAS_LINEAS');
    expect(v.valido).toBe(false);
  });

  it('un monto por encima del Int de Postgres se marca y no suma', () => {
    const v = validarPartidaDoble([
      linea({ clave: 'a', cuentaId: 'c1', debitoCop: MAX_COP_POR_MOVIMIENTO + 1 }),
      linea({ clave: 'b', cuentaId: 'c2', creditoCop: 100 }),
    ]);
    expect(v.porLinea.a).toBe('MONTO_FUERA_DE_RANGO');
    expect(v.totales.debitos).toBe(0);
  });

  it('centavos no entran: el back sólo admite enteros', () => {
    const v = validarPartidaDoble([
      linea({ clave: 'a', cuentaId: 'c1', debitoCop: 100.5 }),
      linea({ clave: 'b', cuentaId: 'c2', creditoCop: 100 }),
    ]);
    expect(v.porLinea.a).toBe('MONTO_INVALIDO');
  });
});

describe('totalesDe', () => {
  it('ignora NaN (CurrencyInput vacío) y ceros', () => {
    expect(
      totalesDe([
        linea({ clave: 'a', cuentaId: 'c1', debitoCop: Number.NaN }),
        linea({ clave: 'b', cuentaId: 'c2', creditoCop: 0 }),
        linea({ clave: 'c', cuentaId: 'c3', creditoCop: 250 }),
      ]),
    ).toEqual({ debitos: 0, creditos: 250, diferencia: -250 });
  });
});
