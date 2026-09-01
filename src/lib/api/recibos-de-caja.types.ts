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
