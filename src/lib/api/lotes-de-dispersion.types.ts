/**
 * Lotes de pagos a propietarios — lo que devuelve
 * `/inmobiliaria/lotes-de-dispersion`.
 *
 * Calcado del back (`dispersiones/lotes/lotes.service.ts`). Un lote es la
 * versión con controles de «exportar a Excel, pasar por el conversor del
 * banco y subir el plano»: se arma, lo aprueba OTRA persona (con código si el
 * monto lo exige), se genera el archivo y alguien confirma que el banco pagó.
 */

/** En qué punto está el lote. Es el enum `EstadoDelLote` del back. */
export type EstadoDelLote =
  | 'BORRADOR'
  | 'ESPERANDO_APROBACION'
  | 'APROBADO'
  | 'ARCHIVO_GENERADO'
  | 'PAGADO'
  | 'ANULADO';

/**
 * Formatos de archivo plano. Los tres existen en el back, pero HOY sólo
 * `BANCOLOMBIA_PAB` tiene generador: pedir otro devuelve 400 con el motivo.
 */
export type FormatoArchivoDePagos = 'BANCOLOMBIA_PAB' | 'BANCOLOMBIA_SAP' | 'ONEPAY';

/** Una fila de la lista. Sin ítems: son ~300 por lote. */
export interface LoteResumen {
  id: string;
  /** `YYYY-MM`. */
  month: string;
  estado: EstadoDelLote;
  /** Sólo lo que sí se puede girar. */
  totalCop: number;
  /** Cuántos pagos entran en el archivo. */
  cantidad: number;
  creadoPorUserId: string;
  aprobadoPorUserId: string | null;
  aprobadoAt: string | null;
  formatoArchivo: FormatoArchivoDePagos | null;
  archivoGeneradoAt: string | null;
  archivoHash: string | null;
  pagadoAt: string | null;
  referenciaBanco: string | null;
  anuladoAt: string | null;
  motivoDeLaAnulacion: string | null;
  createdAt: string;
  _count?: { items: number };
  /** El cupo del día en que se armó. `null` mientras la migración no esté aplicada. */
  disponibleAlArmarCop?: number | null;
  /** Cuánto se giró por encima del cupo. `0` = alcanzaba. */
  descubiertoCop?: number | null;
  /** Qué se decidió sobre la factura al marcar pagado. */
  facturarAhora?: boolean | null;
}

/** Una dispersión dentro del lote, con los datos bancarios congelados. */
export interface ItemDelLote {
  id: string;
  loteId: string;
  dispersionId: string;
  propietarioId: string;
  nombreTitular: string;
  documento: string;
  tipoDocumento: string;
  banco: string;
  tipoDeCuenta: string;
  numeroDeCuenta: string;
  valorCop: number;
  /** Por qué NO va en el archivo. `null` = entra. */
  motivoDeExclusion: string | null;
}

/** El lote entero, como lo devuelven `ver`, `aprobar`, `pagado` y `anular`. */
export interface LoteDeDispersion extends LoteResumen {
  /**
   * El HASH del código, nunca el código. Sirve para una sola cosa acá: saber
   * si este lote exige código (`!== null`) y pedirlo en el formulario.
   */
  codigoHash?: string | null;
  codigoExpiraAt: string | null;
  codigoIntentos: number;
  items: ItemDelLote[];
}

/** A quién le falta un dato, con nombre y motivo. */
export interface FilaExcluida {
  propietarioId: string;
  nombre: string;
  valorCop: number;
  motivo: string;
}

export interface VistaDelLote {
  lote: LoteDeDispersion;
  excluidos: FilaExcluida[];
  /** Intentos de código que quedan antes de que el lote se bloquee. */
  intentosRestantes: number;
  bloqueado: boolean;
}

export interface LoteArmado {
  lote: LoteDeDispersion;
  excluidos: FilaExcluida[];
  /** Lo que había en la cuenta cuando se armó. */
  plata: PlataDisponible;
  /**
   * Cuánto de este lote sale de plata de la inmobiliaria porque no alcanzaba.
   * `0` = alcanzaba. Se puede girar de más (decisión de Nico, 2026-09-15); lo
   * que no se puede es que el número no se vea antes de mandarlo a aprobación.
   */
  descubiertoCop: number;
}

/**
 * Cuánta plata hay HOY para girar.
 *
 * El CEO (2026-09-15): «la plata que yo tengo en mi cuenta hoy es la que
 * debería mostrarse para poder dispersar. No necesito que me hayan cobrado ni
 * que me hayan pagado». Es `entradas del extracto − lo ya comprometido`.
 */
export interface PlataDisponible {
  /** Hasta qué día se contó, `YYYY-MM-DD`. */
  corte: string;
  entradasCop: number;
  comprometidoCop: number;
  /** Puede ser NEGATIVO: ya se adelantó plata propia. */
  disponibleCop: number;
  /**
   * 🔴 `false` = la inmobiliaria nunca cargó un extracto. Entonces el cupo no
   * es «no hay plata», es «no sabemos», y la pantalla lo tiene que decir así.
   */
  hayExtracto: boolean;
  ultimoMovimiento: string | null;
}

/** Cómo se ordena «a quién le pago». */
export type OrdenDeCandidatos = 'MENOR_A_MAYOR' | 'MAYOR_A_MENOR' | 'NOMBRE';

/** Un propietario al que se le puede pagar, con el acumulado hasta él. */
export interface CandidatoDeDispersion {
  dispersionId: string;
  propietarioId: string;
  propietarioName: string;
  month: string;
  netoCop: number;
  /** La suma de esta fila y las anteriores, en este orden. */
  acumuladoCop: number;
  /** El acumulado todavía cabe en el disponible. NO es un bloqueo. */
  entraEnElCupo: boolean;
  /** Por qué no podría ir al banco. `null` = puede. */
  motivoDeExclusion: string | null;
}

export interface CandidatosDeDispersion {
  orden: OrdenDeCandidatos;
  plata: PlataDisponible;
  candidatos: CandidatoDeDispersion[];
  /** Los que caben en el tope pedido, para tildarlos de una. */
  sugeridos: string[];
  totalCop: number;
  cantidad: number;
}

/** Con qué se arma el lote: a quiénes, en qué orden y hasta qué monto. */
export interface QueMeterEnElLote {
  month: string;
  /** Sin la lista, todas las pendientes del mes. */
  dispersionIds?: string[];
  orden?: OrdenDeCandidatos;
  topeCop?: number;
}

/**
 * Lo que devuelve pedir la aprobación.
 *
 * 🔴 El código NO viene acá: sale por correo a quienes pueden aprobar. Lo que
 * vuelve son los correos tapados y hasta cuándo vale.
 */
export interface SolicitudDeAprobacion {
  lote: LoteDeDispersion;
  exigeCodigo: boolean;
  motivoDelCodigo: string | null;
  expiraAt: string | null;
  /** `con***@portofino.co`. */
  enviadoA: string[];
}

/**
 * El archivo generado. Es JSON y no el archivo crudo a propósito: junto al
 * contenido vienen los excluidos, las advertencias y si el layout está
 * verificado — eso se tiene que ver ANTES de guardar el archivo.
 */
export interface ArchivoGenerado {
  nombreArchivo: string;
  contenido: string;
  hash: string;
  formato: FormatoArchivoDePagos;
  cantidad: number;
  totalCop: number;
  excluidos: FilaExcluida[];
  advertencias: string[];
  /** 🔴 `false` hasta que alguien coteje el layout contra un archivo real. */
  layoutVerificado: boolean;
  /** Qué del layout falta confirmar contra el banco. */
  pendienteDeConfirmar: string[];
  /** `true` cuando el lote ya estaba en ARCHIVO_GENERADO y se volvió a entregar el mismo. */
  reenvio: boolean;
}

export interface FiltrosDeLotes {
  month?: string;
  estado?: EstadoDelLote;
}
