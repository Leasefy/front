/**
 * Lo puro del mapeo rubro del P&G → cuentas del PUC.
 *
 * ── Qué cierra esto ────────────────────────────────────────────────────────
 *
 * Hoy `finanzas/presupuesto` muestra «—» en el real de `gastos` y `nomina`
 * porque nadie dijo qué cuenta del PUC es cada rubro (ver el encabezado de
 * `components/finanzas/Presupuesto.tsx`). Con este mapeo, el presupuesto gana
 * `realDelLibroCop` y el guion se convierte en un número medido.
 *
 * ── 🔴 El mapeo no REEMPLAZA las fuentes propias: las acompaña ──────────────
 *
 * Tres rubros ya se miden donde se medían: `comisiones` (comisión causada),
 * `intereses_y_gastos_de_cobranza` (recargos recaudados) y `costos_de_la_plata`
 * (4x1000 y pasarela). El mapeo del PUC es una SEGUNDA lectura que el
 * presupuesto muestra al lado, para que el contador vea si el libro y la
 * operación dicen lo mismo — y `difiereDelLibro` es la alarma cuando no. Si esto
 * pisara la fuente propia, el día que el mapeo esté mal el tablero mentiría sin
 * que nada lo delate.
 *
 * ── La naturaleza la dice el PUC, no la inmobiliaria ───────────────────────
 *
 * Clase 4 → INGRESO, 5/6/7 → COSTO. Un rubro mapeado a cuentas de clases
 * distintas es `MIXTO`, y eso es un error de mapeo que se dice en voz alta: un
 * rubro que suma ingresos y gastos da un número que no significa nada (y que
 * además se ve razonable, que es lo peligroso).
 *
 * ── Una cuenta MAYOR es lo normal, no una excepción ────────────────────────
 *
 * «Gastos = todo el 51» es exactamente lo que un contador quiere decir, y el
 * back suma la cuenta y todas sus hijas. Por eso el selector de este mapeo NO
 * filtra por imputable, al contrario del del asiento manual — donde una cuenta
 * mayor es un 400 (`CUENTA_MAYOR`).
 */

import type {
  FuenteDelReal,
  MapeoDeRubro,
  MapeoDeRubros,
  NaturalezaDelRubro,
} from '@/lib/api/contabilidad.service';

export const NOMBRE_DE_LA_NATURALEZA: Record<NaturalezaDelRubro, string> = {
  INGRESO: 'Ingreso',
  COSTO: 'Gasto',
  MIXTO: 'Mixto',
};

/** De dónde sale el real de cada rubro, en una línea. */
export const NOMBRE_DE_LA_FUENTE: Record<FuenteDelReal, string> = {
  COMISION_CAUSADA: 'La comisión causada del mes',
  RECARGOS_RECAUDADOS: 'Los recargos recaudados del mes',
  COSTOS_DE_LA_PLATA: 'El 4x1000 y la pasarela',
  CUENTAS_DEL_PUC: 'Las cuentas del PUC mapeadas acá',
  SIN_FUENTE: 'Todavía nada: sólo se presupuesta',
};

/** Los rubros que ya se miden por su cuenta y el mapeo sólo acompaña. */
export function tieneFuentePropia(rubro: MapeoDeRubro): boolean {
  return (
    rubro.fuenteDelReal === 'COMISION_CAUSADA' ||
    rubro.fuenteDelReal === 'RECARGOS_RECAUDADOS' ||
    rubro.fuenteDelReal === 'COSTOS_DE_LA_PLATA'
  );
}

/** Los rubros sin ninguna cuenta asignada. */
export function rubrosSinCuenta(mapeo: MapeoDeRubros): MapeoDeRubro[] {
  return mapeo.rubros.filter((r) => r.cuentas.length === 0);
}

/**
 * Los rubros SUGERIDOS sin cuenta: lo que falta de verdad.
 *
 * Un rubro que la inmobiliaria inventó (`sugerido: false`) y dejó sin cuenta no
 * es un pendiente del producto: nadie propuso una cuenta para él. Contarlo entre
 * los faltantes dejaría el mapeo «incompleto» para siempre, y un contador que
 * nunca puede terminar deja de intentarlo.
 */
export function faltantesSugeridos(mapeo: MapeoDeRubros): MapeoDeRubro[] {
  return mapeo.rubros.filter((r) => r.sugerido && r.cuentas.length === 0);
}

/** Los rubros vacíos que el preset SÍ puede llenar (sus cuentas existen). */
export function rubrosSembrables(mapeo: MapeoDeRubros): MapeoDeRubro[] {
  return mapeo.rubros.filter((r) => r.cuentas.length === 0 && r.propuestas.length > 0);
}

/** Los rubros mapeados a cuentas de clases distintas. */
export function rubrosMixtos(mapeo: MapeoDeRubros): MapeoDeRubro[] {
  return mapeo.rubros.filter((r) => r.naturaleza === 'MIXTO');
}

/** Los rubros vacíos cuyo preset NO existe en el plan de esta agencia. */
export function rubrosSinPresetEnElPlan(mapeo: MapeoDeRubros): MapeoDeRubro[] {
  return mapeo.rubros.filter(
    (r) => r.cuentas.length === 0 && r.propuestas.length === 0 && r.codigosPropuestos.length > 0,
  );
}

/**
 * Lo que la pantalla tiene que decir del mapeo, en orden de gravedad.
 *
 * Primero lo que produce un número MAL (mixto), después lo que produce un guion
 * (sin cuenta), después lo que se puede arreglar con un clic (sembrable) y al
 * final lo que necesita crear cuentas en el PUC. Ese orden es el orden en que se
 * resuelve.
 */
export function avisosDelMapeoDeRubros(mapeo: MapeoDeRubros): string[] {
  const avisos: string[] = [];

  const mixtos = rubrosMixtos(mapeo);
  if (mixtos.length > 0) {
    avisos.push(
      `${mixtos.length === 1 ? 'Un rubro está' : `${mixtos.length} rubros están`} mapeado${mixtos.length === 1 ? '' : 's'} ` +
        `a cuentas de clases distintas (${mixtos.map((r) => r.nombre).join(', ')}): ` +
        'su real suma ingresos y gastos, así que el número no significa nada. Deja en cada rubro cuentas de una sola clase.',
    );
  }

  const faltan = faltantesSugeridos(mapeo);
  if (faltan.length > 0) {
    avisos.push(
      `${faltan.length === 1 ? 'Falta la cuenta de 1 rubro' : `Faltan las cuentas de ${faltan.length} rubros`} ` +
        `(${faltan.map((r) => r.nombre).join(', ')}): en el presupuesto su real del libro sigue en «—».`,
    );
  }

  const sinPreset = rubrosSinPresetEnElPlan(mapeo);
  if (sinPreset.length > 0) {
    avisos.push(
      `${sinPreset.length === 1 ? 'Un rubro no tiene' : `${sinPreset.length} rubros no tienen`} su cuenta propuesta en tu plan: ` +
        sinPreset.map((r) => `${r.nombre} (${r.codigosPropuestos.join(', ')})`).join('; ') +
        '. Créala en el plan de cuentas con ese código, o elige otra a mano.',
    );
  }

  return avisos;
}

/**
 * La segunda lectura, explicada. Va en la fila de un rubro con fuente propia:
 * sin esta frase, ver dos números distintos en la misma fila parece un bug.
 */
export function explicacionDeLaSegundaLectura(rubro: MapeoDeRubro): string | null {
  if (!tieneFuentePropia(rubro)) return null;
  return (
    `Este rubro se mide con ${NOMBRE_DE_LA_FUENTE[rubro.fuenteDelReal].toLowerCase()} y eso no cambia. ` +
    'Las cuentas de acá son una segunda lectura, para ver si el libro y la operación dicen lo mismo.'
  );
}

/** Cómo se lee el juego de cuentas de un rubro: «51 · Operacionales +2 más». */
export function resumenDeLasCuentas(rubro: MapeoDeRubro): string {
  if (rubro.cuentas.length === 0) return 'Sin cuenta';
  const [primera, ...resto] = rubro.cuentas;
  const base = `${primera.codigo} · ${primera.nombre}`;
  return resto.length === 0 ? base : `${base} +${resto.length} más`;
}

/**
 * Cuántas de las cuentas del rubro son MAYORES. La pantalla lo dice porque
 * cambia lo que el número significa: una cuenta mayor suma todas sus hijas, así
 * que «51» y «5105» dan totales muy distintos y los dos son válidos.
 */
export function cuentasMayores(rubro: MapeoDeRubro): number {
  return rubro.cuentas.filter((c) => !c.imputable).length;
}
