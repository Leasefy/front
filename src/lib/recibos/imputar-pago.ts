/**
 * A qué períodos va a ir la plata — la MISMA regla que aplica el back, acá
 * sólo para mostrarla antes de emitir.
 *
 * ── Por qué existe una copia ────────────────────────────────────────────────
 * Nico pidió ver, antes de apretar «Emitir recibo», a qué meses y conceptos va
 * el dinero. Calcularlo en el servidor sería un viaje por cada tecla del monto,
 * así que la previsualización se hace acá.
 *
 * 🔴 La AUTORIDAD sigue siendo el back (`imputar-pago.ts` en `back-erp`, módulo
 * `recibos-de-caja`). Esto es una vista previa: lo que quede escrito es lo que
 * devuelve `POST /inmobiliaria/recibos-de-caja/por-cliente` en `imputacion`, y
 * es eso lo que se muestra después de emitir. Si algún día las dos difieren,
 * manda el back y este archivo está mal.
 *
 * ── La regla, con las palabras de Nico (2026-09-12) ─────────────────────────
 * «Si Nico me debe 3 meses y este mes me ingresó 1 millón, ese ingreso va a la
 * deuda vieja, no a la nueva. Es más: ni siquiera me debe permitir abonarle al
 * mes actual.»
 *
 * Por eso la función no recibe «a qué cobro va la plata»: recibe la cartera
 * entera y el monto, y decide sola.
 *
 * ── Qué es «más viejo» ──────────────────────────────────────────────────────
 * El período (`month`, 'YYYY-MM') manda. A igual período —un cliente con dos
 * inmuebles debe el mismo mes dos veces— va primero el que vence antes, y a
 * igual vencimiento el que se creó antes. El desempate final es el id.
 *
 * ── Dentro de un período: primero los intereses ─────────────────────────────
 * Código Civil colombiano, art. 1653: «Si se deben capital e intereses, el pago
 * se imputará primeramente a los intereses». No es una opción de pantalla.
 */

import type { CobroEnCartera } from '@/lib/api/recibos-de-caja.types';

/** Orden de imputación dentro de UN período (Código Civil, art. 1653). */
export const ORDEN_DENTRO_DEL_PERIODO = ['INTERESES', 'CAPITAL'] as const;

/** Lo mínimo que hay que saber de una deuda para ordenarla e imputarle. */
export interface DeudaImputable {
  id: string;
  month: string;
  dueDate?: string | null;
  createdAt?: string | null;
  pendiente: number;
  /** `Cobro.lateFee` y `Cobro.paidAmount`: con los dos se sabe cuánto de lo pendiente es interés. */
  interesesDeMora?: number;
  yaAbonado?: number;
}

export interface ParteImputada {
  id: string;
  month: string;
  /** Lo que de este pago va a este período. Siempre > 0. */
  valorCop: number;
  /** Lo que queda pendiente del período después de esta parte. */
  quedaPendiente: number;
  aIntereses: number;
  aCapital: number;
}

export interface Imputacion {
  /** En el orden en que se aplica: del período más viejo al más nuevo. */
  partes: ParteImputada[];
  /** Lo que el pago tiene de más frente a toda la deuda. Cero si alcanza justo o falta. */
  sobrante: number;
  deudaTotal: number;
  deudaRestante: number;
}

function comoTiempo(valor: string | null | undefined): number {
  if (!valor) return Number.POSITIVE_INFINITY;
  const t = new Date(valor).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** De la más vieja a la más nueva: período, vencimiento, creación, id. */
export function ordenarPorAntiguedad<T extends DeudaImputable>(deudas: readonly T[]): T[] {
  return deudas
    .filter((d) => Number.isFinite(d.pendiente) && d.pendiente > 0)
    .sort((a, b) => {
      if (a.month !== b.month) return a.month < b.month ? -1 : 1;
      const va = comoTiempo(a.dueDate);
      const vb = comoTiempo(b.dueDate);
      if (va !== vb) return va < vb ? -1 : 1;
      const ca = comoTiempo(a.createdAt);
      const cb = comoTiempo(b.createdAt);
      if (ca !== cb) return ca < cb ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

/**
 * Cuánto de lo pendiente de un período es todavía interés de mora.
 *
 * Los abonos anteriores entraron primero a los intereses (misma regla), así que
 * lo que queda de interés es la mora menos lo ya abonado, nunca menos de cero
 * ni más que lo pendiente.
 */
export function interesesPendientes(deuda: DeudaImputable): number {
  const mora = Math.max(0, Math.floor(deuda.interesesDeMora ?? 0));
  const abonado = Math.max(0, Math.floor(deuda.yaAbonado ?? 0));
  return Math.min(Math.max(0, mora - abonado), Math.max(0, deuda.pendiente));
}

/**
 * Reparte `valorCop` sobre la cartera, de la deuda más vieja a la más nueva.
 *
 * A diferencia del back, acá un monto inválido NO lanza: la pantalla llama a
 * esto en cada tecla y el campo puede estar a medio escribir. Un valor que no
 * es un entero positivo devuelve un plan vacío y la previsualización no se
 * pinta — que es justo lo que hay que mostrar mientras no hay monto.
 */
export function imputarPago(
  deudas: readonly DeudaImputable[],
  valorCop: number,
): Imputacion {
  const ordenadas = ordenarPorAntiguedad(deudas);
  const deudaTotal = ordenadas.reduce((suma, d) => suma + d.pendiente, 0);

  if (!Number.isInteger(valorCop) || valorCop <= 0) {
    return { partes: [], sobrante: 0, deudaTotal, deudaRestante: deudaTotal };
  }

  const partes: ParteImputada[] = [];
  let resto = valorCop;
  for (const deuda of ordenadas) {
    if (resto <= 0) break;
    const parte = Math.min(resto, deuda.pendiente);
    const intereses = Math.min(parte, interesesPendientes(deuda));
    partes.push({
      id: deuda.id,
      month: deuda.month,
      valorCop: parte,
      quedaPendiente: deuda.pendiente - parte,
      aIntereses: intereses,
      aCapital: parte - intereses,
    });
    resto -= parte;
  }

  return {
    partes,
    sobrante: resto,
    deudaTotal,
    deudaRestante: deudaTotal - (valorCop - resto),
  };
}

/** La cartera del back, traducida a lo que `imputarPago` necesita. */
export function deudasDeLaCartera(cobros: readonly CobroEnCartera[]): DeudaImputable[] {
  return cobros.map((c) => ({
    id: c.id,
    month: c.month,
    dueDate: c.dueDate,
    createdAt: c.createdAt,
    pendiente: c.pendingAmount,
    interesesDeMora: c.lateFee,
    yaAbonado: c.paidAmount,
  }));
}
