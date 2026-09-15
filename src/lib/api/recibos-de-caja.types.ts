/**
 * Recibo de caja — el documento con el que se registra que ENTRÓ la plata.
 *
 * No es la factura. La factura dice qué se debe; el recibo de caja dice qué se
 * recibió. Un cobro puede tener varios recibos (abonos parciales) y cada uno es
 * un documento propio, numerado y anulable.
 *
 * Contrato del back: `/inmobiliaria/recibos-de-caja` + los dos campos que
 * `GET /inmobiliaria/cobros/:id` agregó (`conceptos`, `recibosDeCaja`).
 *
 * 🔴 El back valida con `forbidNonWhitelisted`: una clave que el DTO no declara
 * no se ignora, devuelve 400. Los cuerpos se arman explícitamente en el
 * servicio y `recibos-de-caja.service.test.ts` fija el juego exacto de claves.
 */

import type { Cobro } from '@/lib/types/inmobiliaria';

/**
 * Los tipos de línea del desglose, tal como los enumera el back.
 *
 * 🔴 No se inventan: si aparece uno que no está acá, la pantalla cae al nombre
 * que mandó el back en vez de romperse o mostrar un hueco.
 */
export const TIPOS_DE_CONCEPTO = [
  'CANON',
  'ADMINISTRACION',
  'CONCEPTO_DEL_CONTRATO',
  'PRORRATEO',
  'INTERES_DE_MORA',
  'GASTO_ADMINISTRATIVO',
  'IVA',
  'RETEFUENTE',
  'RETEICA',
  'RETEIVA',
  'AJUSTE_MANUAL',
] as const;

export type TipoDeConcepto = (typeof TIPOS_DE_CONCEPTO)[number];

/** Una línea del desglose del total adeudado. */
export interface ConceptoDelCobro {
  id: string;
  tipo: TipoDeConcepto;
  nombre: string;
  /**
   * 🔴 SIEMPRE positivo. Lo que decide si suma o resta es `resta`, no el signo.
   * Tratar esto como un número con signo pinta el prorrateo y las retenciones
   * al revés y el desglose deja de cuadrar con el total.
   */
  valorCop: number;
  /** `true` = esta línea RESTA del total (prorrateo, retenciones). */
  resta: boolean;
  reglaId: string | null;
  orden: number;
}

/** Un recibo de caja emitido contra un cobro. */
export interface ReciboDeCaja {
  id: string;
  /**
   * El consecutivo del recibo. El contrato no fija si viaja como número o como
   * cadena ('RC-0001'), así que se acepta cualquiera de las dos y se pinta
   * siempre con `String(...)`.
   */
  numero: string | number;
  valorCop: number;
  fecha: string;
  medio: string;
  referencia: string | null;
  notas: string | null;
  registradoPorUserId: string;
  /** `null` = vivo. Con fecha = anulado; esa plata volvió al saldo del cobro. */
  anuladoAt: string | null;
}

/**
 * El cobro tal como lo devuelve `GET /inmobiliaria/cobros/:id` y las mutaciones
 * de recibo de caja.
 *
 * Los dos campos son opcionales a propósito:
 *   - `conceptos` sólo se llena si la agencia prendió el motor de conceptos —
 *     puede venir vacío y la pantalla tiene que verse bien igual.
 *   - `recibosDeCaja` sólo trae los VIVOS (los anulados no vienen acá).
 */
export interface CobroConDesglose extends Cobro {
  conceptos?: ConceptoDelCobro[];
  recibosDeCaja?: ReciboDeCaja[];
}

/**
 * Lo que devuelve toda mutación de recibo: el recibo y el cobro YA RECOMPUESTO.
 * El cobro que viene acá es el bueno — se usa para refrescar la fila sin pedir
 * el detalle otra vez.
 */
export interface RespuestaDeRecibo {
  recibo: ReciboDeCaja;
  cobro: CobroConDesglose;
}

/** Cuerpo de `POST /inmobiliaria/recibos-de-caja`. */
export interface NuevoReciboDeCaja {
  cobroId: string;
  valorCop: number;
  /** 'YYYY-MM-DD'. Si no va, el back pone hoy. */
  fecha?: string;
  medio: string;
  referencia?: string;
  notas?: string;
}

/**
 * Un período con saldo dentro de la cartera de una persona.
 *
 * Es el cobro, más `sinRespaldo`: plata que el cobro dice recibida y que ningún
 * recibo respalda (un pago por PSE, cartera anterior al recibo de caja).
 * Mientras eso sea > 0 el back no deja abonar ese período — hay que conciliarlo.
 */
export interface CobroEnCartera {
  id: string;
  /** 'YYYY-MM'. Ordena bien como texto, y es lo que define «más viejo». */
  month: string;
  dueDate: string;
  createdAt: string;
  consignacionId: string;
  contractId: string | null;
  leaseId: string | null;
  /** De qué inmueble es esta deuda. Con varios inmuebles es lo que los separa. */
  propertyTitle: string;
  tenantName: string | null;
  totalWithFees: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  daysLate: number;
  /** Intereses de mora acumulados del período. Se cobran ANTES que el capital. */
  lateFee: number;
  sinRespaldo: number;
  conceptos: ConceptoDelCobro[];
}

/**
 * Lo que debe UNA persona en este momento, del período más viejo al más nuevo.
 *
 * `GET /inmobiliaria/recibos-de-caja/cartera/:tenantId` y
 * `.../cartera-por-cobro/:cobroId`. Nico (2026-09-12): «necesito ver si me
 * debe algo en ese momento». Con varios inmuebles la cartera viene JUNTA y
 * cada período dice de cuál es.
 */
export interface CarteraDelCliente {
  tenantId: string | null;
  nombre: string;
  documento: string | null;
  email: string | null;
  /** Cuántos inmuebles distintos tienen saldo. */
  inmuebles: number;
  total: number;
  cobros: CobroEnCartera[];
  /**
   * Plata que este cliente ya pagó de más y todavía no tiene contra qué ir.
   * Cero cuando no tiene, y también cuando la base no tiene la migración del
   * anticipo: el back informa cero antes que romper la cartera entera.
   *
   * Opcional porque un back sin este cambio no lo manda; se lee con `?? 0`.
   */
  saldoAFavor?: number;
  /**
   * 🔴 ¿Esta inmobiliaria puede guardar saldo a favor de esta persona?
   *
   * Cero saldo y «no se puede guardar saldo» son cosas distintas: con `false`
   * (la base todavía no tiene la migración del anticipo) un pago mayor que la
   * deuda va a dar 400, así que el formulario tiene que seguir topando el
   * monto. Ausente se lee como `false`: un back viejo no promete nada.
   */
  anticipoDisponible?: boolean;
}

/**
 * Cuerpo de `POST /inmobiliaria/recibos-de-caja/por-cliente`.
 *
 * 🔴 NO lleva «a qué cobro va la plata», y es a propósito: el destino lo decide
 * la regla de imputación del back (la deuda más vieja primero). Se dice de
 * QUIÉN es el pago con `tenantId` o con `cobroId` —uno de los dos, nunca los
 * dos—, cuánto, qué día entró, cómo pagó y los saludos.
 */
export interface NuevoReciboPorCliente {
  tenantId?: string;
  cobroId?: string;
  valorCop: number;
  /** 'YYYY-MM-DD'. Si no va, el back pone hoy en Bogotá. */
  fecha?: string;
  medio: string;
  referencia?: string;
  /** Los «saludos»: el texto que sale impreso en el recibo. */
  notas?: string;
  /**
   * Una por apertura del formulario (R1). Con la misma llave el servidor
   * devuelve el recibo de la primera vez en vez de emitir otro: un timeout
   * seguido de un reintento ya no deja dos juegos de recibos. Hasta 64.
   */
  idempotencyKey?: string;
}

/** A qué período fue una parte del pago, y cuánto de eso cubrió intereses. */
export interface ParteDeLaImputacion {
  cobroId: string;
  month: string;
  propertyTitle: string;
  valorCop: number;
  /** Código Civil, art. 1653: dentro de un período, primero los intereses. */
  aIntereses: number;
  aCapital: number;
  quedaPendiente: number;
}

/**
 * Lo que devuelve el recibo por cliente: UN recibo por cada período que el pago
 * tocó, los cobros ya recompuestos, y el plan de imputación para mostrarlo.
 */
export interface RespuestaDeReciboPorCliente {
  recibos: ReciboDeCaja[];
  cobros: CobroConDesglose[];
  imputacion: ParteDeLaImputacion[];
  totalCop: number;
  /** Lo que la persona sigue debiendo después de este pago. */
  deudaRestante: number;
  /**
   * Lo que de este pago quedó A FAVOR del cliente: entró más plata que deuda.
   * Se consume solo contra los cobros que vayan apareciendo, del más viejo al
   * más nuevo. Cero cuando el pago alcanzó justo o faltó.
   *
   * Opcional por la misma razón que `saldoAFavor`.
   */
  anticipoCop?: number;
}

/** Un movimiento del libro de saldo a favor: positivo entra, negativo se gasta. */
export interface MovimientoDeAnticipo {
  id: string;
  nombre: string;
  valorCop: number;
  fecha: string;
  medio: string;
  referencia: string | null;
  notas: string | null;
  reciboDeCajaId: string | null;
  createdAt: string;
}

/** Lo que devuelve `GET /inmobiliaria/recibos-de-caja/anticipos/:tenantId`. */
export interface SaldoAFavorDelCliente {
  tenantId: string | null;
  nombre: string;
  saldoCop: number;
  /** `false` = esta base todavía no tiene la migración: no ofrecer nada que dependa del anticipo. */
  disponible: boolean;
  movimientos: MovimientoDeAnticipo[];
}

/** Lo que devuelve aplicar el saldo a favor a la cartera de hoy. */
export interface ResultadoDeAplicarAnticipos {
  aplicadoCop: number;
  saldoAFavor: number;
  deudaRestante: number;
  recibos: ReciboDeCaja[];
}

/** Filtros de `GET /inmobiliaria/recibos-de-caja`. */
export interface FiltrosDeRecibos {
  desde?: string;
  hasta?: string;
  medio?: string;
  referencia?: string;
  incluirAnulados?: boolean;
}

/** Cuerpo de `POST /inmobiliaria/recibos-de-caja/conciliar/:cobroId`. */
export interface ConciliacionDePagoAnterior {
  /** De dónde salió la plata que ya estaba registrada. Mínimo 5 caracteres. */
  origen: string;
  medio?: string;
  referencia?: string;
  notas?: string;
}

/** ¿Este recibo sigue vivo? */
export function estaVivo(recibo: ReciboDeCaja): boolean {
  return !recibo.anuladoAt;
}

/**
 * Cuánto suma el desglose.
 *
 * Devuelve las tres cifras por separado porque la pantalla las muestra las
 * tres: lo que suma, lo que resta y el total. `resta` decide el signo —
 * `valorCop` siempre viene positivo.
 */
export function sumarConceptos(conceptos: readonly ConceptoDelCobro[]): {
  suma: number;
  resta: number;
  total: number;
} {
  let suma = 0;
  let resta = 0;
  for (const c of conceptos) {
    if (c.resta) resta += c.valorCop;
    else suma += c.valorCop;
  }
  return { suma, resta, total: suma - resta };
}

/** Los conceptos en el orden en que el back los quiere ver. */
export function enOrden(conceptos: readonly ConceptoDelCobro[]): ConceptoDelCobro[] {
  return [...conceptos].sort((a, b) => a.orden - b.orden);
}
