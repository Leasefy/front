/**
 * CB-09 (Nico, 03-10-2026): en Presupuesto, «Real» es el LIBRO (el mismo número
 * que Estados financieros) y la operación va al lado como referencia.
 */
import { describe, expect, it } from 'vitest';

import type { ComparacionDelPresupuesto, FilaDelPresupuesto, FuenteDelReal } from '@/lib/api/finanzas.types';
import { presupuestoContraElLibro } from './presupuesto-contra-el-libro';

function fila(extra: Partial<FilaDelPresupuesto>): FilaDelPresupuesto {
  return {
    rubro: 'comisiones',
    nombre: 'Comisiones de administración',
    naturaleza: 'INGRESO',
    presupuestoCop: null,
    realCop: null,
    anioAnteriorCop: null,
    contraPresupuestoCop: null,
    variacionAnualPct: null,
    motivoSinReal: null,
    ...extra,
  };
}

const FUENTES = new Map<string, FuenteDelReal>([
  ['comisiones', 'COMISION_CAUSADA'],
  ['costos_de_la_plata', 'COSTOS_DE_LA_PLATA'],
  ['gastos', 'CUENTAS_DEL_PUC'],
]);

function comparacion(filas: FilaDelPresupuesto[]): Pick<ComparacionDelPresupuesto, 'filas' | 'totales'> {
  return {
    filas,
    totales: {
      presupuestoCop: filas.reduce((s, f) => s + (f.presupuestoCop ?? 0), 0),
      realCop: filas.reduce((s, f) => s + (f.realCop ?? 0), 0),
      anioAnteriorCop: 0,
      rubrosSinReal: filas.filter((f) => f.realCop === null).length,
    },
  };
}

describe('presupuestoContraElLibro', () => {
  it('🔴 el caso del laboratorio: Real = libro $358.000, la operación $8.757.000 al lado', () => {
    const r = presupuestoContraElLibro(
      comparacion([
        fila({
          presupuestoCop: 1_000_000,
          realCop: 8_757_000,
          realDelLibroCop: 358_000,
          contraPresupuestoCop: 7_757_000,
          anioAnteriorCop: 0,
          difiereDelLibro: true,
        }),
        fila({ rubro: 'costos_de_la_plata', nombre: 'Costos de la plata', naturaleza: 'COSTO', realCop: 0, realDelLibroCop: -119_100 }),
        fila({ rubro: 'gastos', nombre: 'Gastos', naturaleza: 'COSTO', realCop: 50_000, realDelLibroCop: 50_000 }),
      ]),
      FUENTES,
    );
    const [comisiones, costos, gastos] = r.filas;
    expect(comisiones.realCop).toBe(358_000);
    expect(comisiones.operacionCop).toBe(8_757_000);
    expect(comisiones.contraPresupuestoCop).toBe(358_000 - 1_000_000);
    expect(costos.realCop).toBe(-119_100);
    expect(costos.operacionCop).toBe(0);
    // Un rubro del PUC ya es el libro: sin cifra de la operación.
    expect(gastos.realCop).toBe(50_000);
    expect(gastos.operacionCop).toBeNull();
    expect(r.hayOperacion).toBe(true);
    expect(r.totales.realCop).toBe(358_000 - 119_100 + 50_000);
    expect(r.totales.operacionCop).toBe(8_757_000);
  });

  it('🔴 el año pasado de la operación no se compara contra el libro de hoy', () => {
    const r = presupuestoContraElLibro(
      comparacion([fila({ realCop: 500, realDelLibroCop: 400, anioAnteriorCop: 300, variacionAnualPct: 66.7 })]),
      FUENTES,
    );
    expect(r.filas[0].anioAnteriorCop).toBeNull();
    expect(r.filas[0].variacionAnualPct).toBeNull();
    // Con el año pasado del LIBRO, sí.
    const conLibro = presupuestoContraElLibro(
      comparacion([fila({ realCop: 500, realDelLibroCop: 400, anioAnteriorCop: 300, anioAnteriorDelLibroCop: 200 })]),
      FUENTES,
    );
    expect(conLibro.filas[0].anioAnteriorCop).toBe(200);
    expect(conLibro.filas[0].variacionAnualPct).toBe(100);
  });

  it('sin cuentas del PUC el libro no mide: guion y el porqué, nunca la operación en su lugar', () => {
    const r = presupuestoContraElLibro(
      comparacion([fila({ realCop: 8_757_000, realDelLibroCop: null })]),
      FUENTES,
    );
    expect(r.filas[0].realCop).toBeNull();
    expect(r.filas[0].operacionCop).toBe(8_757_000);
    expect(r.filas[0].motivoSinReal).toMatch(/Rubros del P&G/);
    expect(r.totales.rubrosSinReal).toBe(1);
  });

  it('back anterior al 18-09 (sin real del libro): todo como lo manda el back', () => {
    const c = comparacion([fila({ realCop: 112, contraPresupuestoCop: 12, variacionAnualPct: 17.9 })]);
    const r = presupuestoContraElLibro(c, FUENTES);
    expect(r.filas[0].realCop).toBe(112);
    expect(r.filas[0].contraPresupuestoCop).toBe(12);
    expect(r.filas[0].variacionAnualPct).toBe(17.9);
    expect(r.hayOperacion).toBe(false);
    expect(r.totales).toEqual({
      presupuestoCop: c.totales.presupuestoCop,
      realCop: c.totales.realCop,
      operacionCop: null,
      rubrosSinReal: c.totales.rubrosSinReal,
    });
  });
});

describe('presupuestoContraElLibro · back 26beefbc', () => {
  it('🔴 con `realDeLaOperacionCop` el back ya trae el libro: todo tal cual y la operación al lado', () => {
    const r = presupuestoContraElLibro(
      comparacion([
        fila({
          presupuestoCop: 1_000_000,
          realCop: 358_000,
          realDelLibroCop: 358_000,
          realDeLaOperacionCop: 8_757_000,
          contraPresupuestoCop: -642_000,
          anioAnteriorCop: 300_000,
          variacionAnualPct: 19.3,
        }),
        fila({ rubro: 'gastos', nombre: 'Gastos', naturaleza: 'COSTO', realCop: 50_000, realDelLibroCop: 50_000, realDeLaOperacionCop: null }),
      ]),
      FUENTES,
    );
    expect(r.filas[0]).toMatchObject({
      realCop: 358_000,
      operacionCop: 8_757_000,
      contraPresupuestoCop: -642_000,
      anioAnteriorCop: 300_000,
      variacionAnualPct: 19.3,
    });
    expect(r.filas[1].operacionCop).toBeNull();
    expect(r.totales.operacionCop).toBe(8_757_000);
  });
});
