/**
 * Las reglas del asiento de apertura — lo que decide si el botón se aprieta.
 *
 * Se prueban como funciones puras: acá no hay nada que un mock pueda tapar.
 * 🔴 El caso que importa es el descuadre: un asiento descuadrado NO puede
 * viajar, y el back lo rechazaría igual — pero un 400 después de cargar 40
 * filas es la clase de cosa que hace abandonar la migración.
 */

import { describe, it, expect } from 'vitest';

import {
  esCuentaDeTerceros,
  esFechaContable,
  movimientosDeApertura,
  problemasDeApertura,
  puedeEnviarApertura,
  totalesDeApertura,
  type FilaDeApertura,
  type TerceroDeApertura,
} from './asiento-de-apertura';

function fila(cuentaId: string | null, debitoCop = 0, creditoCop = 0): FilaDeApertura {
  return { id: `${cuentaId}-${debitoCop}-${creditoCop}`, cuentaId, debitoCop, creditoCop };
}

const FECHA = '2026-01-01';

describe('esFechaContable — AAAA-MM-DD y que el día exista', () => {
  it.each(['2026-01-01', '2025-12-31', '2024-02-29'])('%s vale', (f) => {
    expect(esFechaContable(f)).toBe(true);
  });
  it.each(['', '01/01/2026', '2026-1-1', '2026-02-30', '2026-13-01', '2026-01-01T00:00:00Z'])(
    '%s no vale',
    (f) => {
      expect(esFechaContable(f)).toBe(false);
    },
  );
});

describe('totalesDeApertura', () => {
  it('suma cada pata y da la diferencia', () => {
    const t = totalesDeApertura([fila('c1', 1_000_000), fila('c2', 0, 600_000)]);
    expect(t).toEqual({ debitos: 1_000_000, creditos: 600_000, diferencia: 400_000 });
  });

  it('una fila vacía (sin cuenta ni monto) no suma ni estorba', () => {
    const t = totalesDeApertura([fila('c1', 500), fila(null), fila('c2', 0, 500)]);
    expect(t.diferencia).toBe(0);
  });

  it('un NaN (CurrencyInput vacío) cuenta como cero, no como NaN', () => {
    const t = totalesDeApertura([fila('c1', Number.NaN), fila('c2', 0, 10)]);
    expect(t.debitos).toBe(0);
    expect(t.creditos).toBe(10);
  });
});

describe('🔴 puedeEnviarApertura — descuadrado NO viaja', () => {
  it('cuadrado, dos cuentas, fecha válida → se puede', () => {
    const filas = [fila('c1', 2_500_000), fila('c2', 0, 2_500_000)];
    expect(problemasDeApertura(filas, FECHA)).toEqual([]);
    expect(puedeEnviarApertura(filas, FECHA)).toBe(true);
  });

  it('descuadrado por un peso → no se puede, y dice por qué', () => {
    const filas = [fila('c1', 2_500_000), fila('c2', 0, 2_499_999)];
    expect(puedeEnviarApertura(filas, FECHA)).toBe(false);
    expect(problemasDeApertura(filas, FECHA)).toContain('DESCUADRADO');
  });

  it('una sola línea no es un asiento', () => {
    expect(problemasDeApertura([fila('c1', 100)], FECHA)).toContain('POCAS_LINEAS');
  });

  it('una línea con monto pero sin cuenta', () => {
    const filas = [fila(null, 100), fila('c2', 0, 100)];
    expect(problemasDeApertura(filas, FECHA)).toContain('SIN_CUENTA');
  });

  it('una línea con cuenta pero sin monto', () => {
    const filas = [fila('c1'), fila('c2', 100), fila('c3', 0, 100)];
    expect(problemasDeApertura(filas, FECHA)).toContain('SIN_MONTO');
  });

  it('débito Y crédito en la misma línea es ambiguo (MOVIMIENTO_AMBIGUO del back)', () => {
    const filas = [fila('c1', 100, 100), fila('c2', 100, 100)];
    expect(problemasDeApertura(filas, FECHA)).toContain('AMBIGUA');
  });

  it('más de un Int de Postgres en una línea no entra (MONTO_FUERA_DE_RANGO)', () => {
    const filas = [fila('c1', 3_000_000_000), fila('c2', 0, 3_000_000_000)];
    expect(problemasDeApertura(filas, FECHA)).toContain('FUERA_DE_RANGO');
  });

  it('la misma cuenta dos veces en la apertura es un error de carga', () => {
    const filas = [fila('c1', 100), fila('c1', 0, 100)];
    expect(problemasDeApertura(filas, FECHA)).toContain('CUENTA_REPETIDA');
  });

  /*
   * La cartera de tres inquilinos son tres líneas en 130505, una por
   * tercero: no es una cuenta repetida. Dos líneas al MISMO tercero sí.
   */
  it('la misma cuenta con terceros distintos son líneas distintas', () => {
    const ana: TerceroDeApertura = { tipo: 'ARRENDATARIO', id: 'u-ana', nombre: 'Ana' };
    const luis: TerceroDeApertura = { tipo: 'ARRENDATARIO', id: 'u-luis', nombre: 'Luis' };
    const filas = [
      { ...fila('c1', 100), tercero: ana },
      { ...fila('c1', 200), tercero: luis },
      fila('c2', 0, 300),
    ];
    expect(problemasDeApertura(filas, FECHA)).not.toContain('CUENTA_REPETIDA');
    expect(puedeEnviarApertura(filas, FECHA)).toBe(true);
    const repetidas = [{ ...fila('c1', 100), tercero: ana }, { ...fila('c1', 200), tercero: ana }, fila('c2', 0, 300)];
    expect(problemasDeApertura(repetidas, FECHA)).toContain('CUENTA_REPETIDA');
  });

  it('sin fecha válida no viaja aunque cuadre', () => {
    const filas = [fila('c1', 100), fila('c2', 0, 100)];
    expect(puedeEnviarApertura(filas, '2026-02-30')).toBe(false);
    expect(problemasDeApertura(filas, '')).toContain('SIN_FECHA');
  });
});

describe('movimientosDeApertura — la forma de MovimientoDto', () => {
  it('manda sólo la pata que aplica y omite las filas vacías', () => {
    const filas = [fila('c1', 100), fila(null), fila('c2', 0, 100)];
    expect(movimientosDeApertura(filas)).toEqual([
      { cuentaId: 'c1', debitoCop: 100 },
      { cuentaId: 'c2', creditoCop: 100 },
    ]);
  });

  it('el tercero viaja como terceroTipo + terceroId, tal como lo asienta el motor', () => {
    const filas = [
      { ...fila('c1', 100), tercero: { tipo: 'ARRENDATARIO', id: 'u-ana', nombre: 'Ana Pérez' } as TerceroDeApertura },
      fila('c2', 0, 100),
    ];
    expect(movimientosDeApertura(filas)[0]).toEqual({
      cuentaId: 'c1',
      debitoCop: 100,
      terceroTipo: 'ARRENDATARIO',
      terceroId: 'u-ana',
      descripcion: 'Ana Pérez',
    });
  });
});

describe('esCuentaDeTerceros', () => {
  it('deudores (13), cuentas por pagar (23) e ingresos para terceros (28) llevan tercero; bancos y patrimonio no', () => {
    expect(esCuentaDeTerceros('130505')).toBe(true);
    expect(esCuentaDeTerceros('28150505')).toBe(true);
    expect(esCuentaDeTerceros('233595')).toBe(true);
    expect(esCuentaDeTerceros('111005')).toBe(false);
    expect(esCuentaDeTerceros('3105')).toBe(false);
  });
});
