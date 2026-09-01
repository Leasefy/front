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
