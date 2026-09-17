/**
 * Deducciones del propietario — lo que manda el back
 * (`back-erp/src/inmobiliaria/deducciones/`).
 *
 * La liquidación del propietario es «lo que el contrato cobra menos sus
 * deducciones» (Nico y Juan Camilo, 2026-09-16). Toda la cuenta la hace el back
 * con UNA regla (`neto-con-deducciones.ts`): acá no se suma ni se resta nada,
 * se pinta lo que llega.
 */

/** De dónde sale la deducción. */
export type OrigenDeDeduccion = 'REPARACION' | 'MANUAL' | 'SALDO_ANTERIOR';

/** En qué va. `PROYECTADA` = calculada para una liquidación que todavía no se generó. */
export type EstadoDeLaDeduccion =
  | 'PENDIENTE'
  | 'EN_LIQUIDACION'
  | 'APLICADA'
  | 'ANULADA'
  | 'PROYECTADA';

export interface DeduccionDeLaLiquidacion {
  id: string;
  propietarioId: string;
  origen: OrigenDeDeduccion;
  motivo: string;
  /** Lo que se le descuenta a ESTE dueño. */
  valorCop: number;
  /** La primera liquidación en la que puede entrar, `YYYY-MM`. */
  mesDesde: string;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** Las partes de una misma deducción repartida entre copropietarios. */
  grupoId: string;
  /** El valor antes de repartir. */
  valorTotalCop: number;
  /** 10000 = el inmueble entero. */
  participacionBps: number;
  consignacionId: string | null;
  solicitudMantenimientoId: string | null;
  tieneSoporte: boolean;
  soporteNombre: string | null;
  estado: EstadoDeLaDeduccion;
}

/** Un renglón de la liquidación, con el signo en el número. */
export interface RenglonDeLaDeduccion {
  concepto: string;
  valorCop: number;
  motivo: string;
}

/**
 * El bloque de deducciones de UNA liquidación (vista previa, dispersión o
 * extracto). Opcional en quien lo trae: un back anterior al 2026-09-16 no lo
 * manda, y entonces la pantalla se queda con el neto de siempre.
 */
export interface DeduccionesDeLaLiquidacion {
  /** Lo que el contrato cobra, antes de las deducciones. */
  netoDelMesCop: number;
  deducciones: DeduccionDeLaLiquidacion[];
  deduccionesCop: number;
  /** De las deducciones, lo que viene del mes anterior. */
  saldoAnteriorCop: number;
  /** Neto del mes menos deducciones. Puede ser negativo. */
  netoCop: number;
  /** 🔴 Lo que se gira: entero o nada. */
  aGirarCop: number;
  /** Lo que queda en contra y pasa a la siguiente liquidación. */
  saldoEnContraCop: number;
  /** Lo que las deducciones cubrieron de este mes. */
  compensadoCop: number;
  renglones: RenglonDeLaDeduccion[];
}

/** Una fila del listado de la ficha. */
export interface DeduccionDelListado extends DeduccionDeLaLiquidacion {
  /** El mes de la liquidación donde está reservada o aplicada. */
  mesDeLaLiquidacion: string | null;
  loteId: string | null;
  aplicadaAt: string | null;
  anuladaAt: string | null;
  motivoDeAnulacion: string | null;
  createdAt: string;
}

export interface ListadoDeDeducciones {
  /** `false` = la base todavía no tiene la tabla. `motivo` dice qué falta. */
  disponible: boolean;
  motivo: string | null;
  deducciones: DeduccionDelListado[];
  totales: {
    pendienteCop: number;
    enLiquidacionCop: number;
    saldoEnContraCop: number;
  };
}

export interface NuevoDescuento {
  motivo: string;
  valorCop: number;
  /** El inmueble del descuento. Con varios dueños, el back lo reparte. */
  consignacionId?: string | null;
  soporte: File;
}

/** A cargo de quién queda una reparación al aprobar su cotización. */
export type ACargoDe = 'PROPIETARIO' | 'INQUILINO';

/** Lo que devuelve aprobar una cotización con `aCargoDe`. */
export interface CargoDeLaReparacion {
  aCargoDe: ACargoDe;
  deduccionIds: string[];
  /** Lo que la pantalla tiene que decir, en palabras. */
  avisos: string[];
}
