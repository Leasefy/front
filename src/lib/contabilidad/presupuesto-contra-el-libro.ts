/**
 * 🔴 CB-09 (QA de Contabilidad · Nico, 03-10-2026): en Presupuesto, la columna
 * «Real» es la del LIBRO — el mismo número que Estados financieros —, y lo de la
 * operación va al lado, como referencia. PURA.
 *
 * El back manda las dos lecturas por rubro (contrato del 18-09):
 *   · `realCop` — en un rubro con FUENTE PROPIA (la comisión causada, los
 *     recargos recaudados, los costos de la plata) es la OPERACIÓN; en un rubro
 *     del PUC ya es el libro;
 *   · `realDelLibroCop` — la suma de las cuentas del PUC mapeadas al rubro
 *     (`null` = el rubro no tiene cuentas).
 * Y calcula «contra el presupuesto», la variación y los totales con `realCop`.
 * Para que la tabla diga el libro, en un rubro con fuente propia se toma
 * `realDelLibroCop` y se recalcula lo que depende de él.
 *
 * El año anterior: en un rubro con fuente propia `anioAnteriorCop` es de la
 * operación. Comparar el libro de hoy con la operación del año pasado sería
 * comparar dos cosas distintas, así que sin `anioAnteriorDelLibroCop` esa celda
 * y su variación salen con guion (lo pide QA-CONTA-BACK).
 *
 * Un back anterior al 18-09 (sin `realDelLibroCop`): no hay libro que leer y
 * todo queda como lo manda el back.
 */

import type {
  ComparacionDelPresupuesto,
  FilaDelPresupuesto,
  FuenteDelReal,
} from '@/lib/api/finanzas.types';

export interface FilaContraElLibro {
  rubro: string;
  nombre: string;
  naturaleza: FilaDelPresupuesto['naturaleza'];
  presupuestoCop: number | null;
  /** El real del LIBRO. `null` = no se puede medir (nunca `0`). */
  realCop: number | null;
  /** Lo que dice la operación, sólo en un rubro con fuente propia. */
  operacionCop: number | null;
  contraPresupuestoCop: number | null;
  anioAnteriorCop: number | null;
  variacionAnualPct: number | null;
  motivoSinReal: string | null;
}

export interface PresupuestoContraElLibro {
  filas: FilaContraElLibro[];
  totales: {
    presupuestoCop: number;
    realCop: number;
    operacionCop: number | null;
    rubrosSinReal: number;
  };
  /** ¿Hay algún rubro con cifra de la operación? (si no, la columna no se pinta). */
  hayOperacion: boolean;
}

const SIN_CUENTAS_EN_EL_LIBRO =
  'Este rubro no tiene cuentas del PUC asignadas, así que el libro no lo puede medir: se asignan en Contabilidad → Mapeo → Rubros del P&G. Mientras tanto, la cifra de la operación va al lado como referencia.';

function variacion(real: number | null, anterior: number | null): number | null {
  if (real === null || anterior === null || anterior === 0) return null;
  return Number((((real - anterior) / Math.abs(anterior)) * 100).toFixed(1));
}

export function presupuestoContraElLibro(
  comparacion: Pick<ComparacionDelPresupuesto, 'filas' | 'totales'>,
  fuentes: ReadonlyMap<string, FuenteDelReal>,
): PresupuestoContraElLibro {
  /*
   * Back nuevo (26beefbc): `realDeLaOperacionCop` presente ⇒ `realCop` ya es el
   * libro, y también lo son «contra el presupuesto», la variación, el año
   * anterior y los totales. Se toman TAL CUAL; la operación va al lado.
   */
  if (comparacion.filas.some((f) => f.realDeLaOperacionCop !== undefined)) {
    const filas = comparacion.filas.map(
      (f): FilaContraElLibro => ({
        rubro: f.rubro,
        nombre: f.nombre,
        naturaleza: f.naturaleza,
        presupuestoCop: f.presupuestoCop,
        realCop: f.realCop,
        operacionCop: f.realDeLaOperacionCop ?? null,
        contraPresupuestoCop: f.contraPresupuestoCop,
        anioAnteriorCop: f.anioAnteriorCop,
        variacionAnualPct: f.variacionAnualPct,
        motivoSinReal: f.motivoSinReal,
      }),
    );
    const hayOperacion = filas.some((f) => f.operacionCop !== null);
    return {
      filas,
      hayOperacion,
      totales: {
        presupuestoCop: comparacion.totales.presupuestoCop,
        realCop: comparacion.totales.realCop,
        operacionCop: hayOperacion ? filas.reduce((s, f) => s + (f.operacionCop ?? 0), 0) : null,
        rubrosSinReal: comparacion.totales.rubrosSinReal,
      },
    };
  }

  const hayLibro = comparacion.filas.some((f) => f.realDelLibroCop !== undefined);

  const filas = comparacion.filas.map((f): FilaContraElLibro => {
    const fuente = fuentes.get(f.rubro);
    const fuentePropia = fuente !== undefined && fuente !== 'CUENTAS_DEL_PUC' && fuente !== 'SIN_FUENTE';
    if (f.realDelLibroCop === undefined || !fuentePropia) {
      // Back anterior al 18-09, o un rubro cuyo real YA es el libro: tal cual.
      return {
        rubro: f.rubro,
        nombre: f.nombre,
        naturaleza: f.naturaleza,
        presupuestoCop: f.presupuestoCop,
        realCop: f.realCop,
        operacionCop: null,
        contraPresupuestoCop: f.contraPresupuestoCop,
        anioAnteriorCop: f.anioAnteriorCop,
        variacionAnualPct: f.variacionAnualPct,
        motivoSinReal: f.motivoSinReal,
      };
    }
    const real = f.realDelLibroCop;
    const anterior = f.anioAnteriorDelLibroCop !== undefined ? f.anioAnteriorDelLibroCop : null;
    return {
      rubro: f.rubro,
      nombre: f.nombre,
      naturaleza: f.naturaleza,
      presupuestoCop: f.presupuestoCop,
      realCop: real,
      operacionCop: f.realCop,
      contraPresupuestoCop: real === null || f.presupuestoCop === null ? null : real - f.presupuestoCop,
      anioAnteriorCop: anterior,
      variacionAnualPct: variacion(real, anterior),
      motivoSinReal: real === null ? SIN_CUENTAS_EN_EL_LIBRO : null,
    };
  });

  const hayOperacion = filas.some((f) => f.operacionCop !== null);
  if (!hayLibro) {
    return {
      filas,
      hayOperacion,
      totales: {
        presupuestoCop: comparacion.totales.presupuestoCop,
        realCop: comparacion.totales.realCop,
        operacionCop: null,
        rubrosSinReal: comparacion.totales.rubrosSinReal,
      },
    };
  }
  return {
    filas,
    hayOperacion,
    totales: {
      presupuestoCop: comparacion.totales.presupuestoCop,
      realCop: filas.reduce((s, f) => s + (f.realCop ?? 0), 0),
      operacionCop: hayOperacion ? filas.reduce((s, f) => s + (f.operacionCop ?? 0), 0) : null,
      rubrosSinReal: filas.filter((f) => f.realCop === null).length,
    },
  };
}
