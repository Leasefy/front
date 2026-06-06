/**
 * Conciliación bancaria — contrato de tipos (v6-03, frontend-first).
 *
 * Shape que el motor de conciliación (M2 — back-main) implementará: ingesta de
 * archivos bancarios (Bancolombia + multi-fuente), matching difuso movimiento→
 * obligación, y detección de casos. La UI se construye contra estos tipos con
 * estado vacío honesto; NO hay data falsa hasta que exista el backend.
 */

/** Resultado de clasificar un movimiento bancario contra los recaudos esperados. */
export type CasoConciliacion =
  | 'conciliado'        // match completo (referencia + valor)
  | 'parcial'           // pago parcial de la obligación
  | 'duplicado'         // pago duplicado detectado
  | 'no_identificado'   // ingreso sin obligación asociada
  | 'diferencia_valor'  // match por referencia pero valor distinto
  | 'fuera_de_fecha';   // pago fuera de la ventana esperada

/** Estado de revisión de un match sugerido. */
export type EstadoMatch = 'sugerido' | 'confirmado' | 'rechazado';

/** Una fuente bancaria cargada para conciliar. */
export interface FuenteConciliacion {
  id: string;
  nombre: string;          // nombre del archivo
  banco: string;           // p.ej. 'Bancolombia'
  fechaCarga: string;      // ISO
  totalMovimientos: number;
  conciliadosAuto: number; // cuántos concilió el motor automáticamente
}

/** Un movimiento bancario y su clasificación/sugerencia de conciliación. */
export interface MovimientoBancario {
  id: string;
  fuenteId: string;
  fecha: string;                 // ISO
  referencia: string;            // tercero/referencia única del banco
  valorBanco: number;            // COP
  valorEsperado?: number;        // COP (si hay obligación candidata)
  caso: CasoConciliacion;
  estado: EstadoMatch;
  // sugerencia del motor (M2):
  sugerenciaContratoId?: string;
  sugerenciaContratoLabel?: string;
  sugerenciaTerceroNombre?: string;
  sugerenciaConcepto?: string;
}

/** Conteos por caso para el resumen de una conciliación. */
export interface ResumenConciliacion {
  total: number;
  conciliados: number;
  parciales: number;
  duplicados: number;
  noIdentificados: number;
  diferencias: number;
  fueraDeFecha: number;
}

/** Contrato del listado paginado que el motor (M2) devolverá. */
export interface ConciliacionListResponse {
  fuente: FuenteConciliacion | null;
  resumen: ResumenConciliacion;
  movimientos: MovimientoBancario[];
}

export const RESUMEN_VACIO: ResumenConciliacion = {
  total: 0,
  conciliados: 0,
  parciales: 0,
  duplicados: 0,
  noIdentificados: 0,
  diferencias: 0,
  fueraDeFecha: 0,
};
