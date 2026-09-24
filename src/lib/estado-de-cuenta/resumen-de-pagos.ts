/**
 * Las tres tarjetas de arriba de «Pagos» en el portal del inquilino.
 *
 * 🔴 QA 22-09 (P0): a un inquilino que debía $50.150.000 vencidos, «Pagos» le
 * decía «Pendiente $0», «Vence en NaN días» y «Progreso del mes NaN%». Sumaba
 * las solicitudes de pago (el modelo viejo: sólo lo que él subió y espera
 * validación) y contaba el vencimiento con un `paymentDay` que el arriendo
 * migrado no trae. En la misma sesión, «Inicio» y «Mi estado de cuenta» daban
 * otros números: tres pantallas del mismo portal, tres respuestas.
 *
 * La deuda nace con el CONTRATO (`deuda-del-contrato-es-el-centro.md`), y su
 * documento es el estado de cuenta. Así que estas tarjetas salen de
 * `resumirElCliente` — la MISMA función que pinta «Mi estado de cuenta» — y un
 * número de acá siempre se puede rastrear hasta una fila de allá.
 *
 * Nunca un NaN: si no hay próxima cuota, se dice que no la hay.
 */

import { diasEntre, resumirElCliente } from '@/components/estado-de-cuenta/resumen';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export interface ResumenDePagos {
  /** La primera cuota que todavía no vence, con cuántos días le faltan. */
  proxima: { valor: number; fecha: string; diasQueFaltan: number } | null;
  /** Lo vencido y no pagado: vencido en plazo + cartera. */
  vencidoCop: number;
  cuotasVencidas: number;
  /** Todo lo que falta del contrato (o contratos), vencido o no. */
  restaPorPagar: number;
  enMora: boolean;
  diasDeMora: number;
}

/** `hoy` en `YYYY-MM-DD`, la fecha de calendario del que mira. */
export function resumenDePagos(doc: EstadoDeCuenta, hoy: string): ResumenDePagos {
  const r = resumirElCliente(doc, hoy);
  return {
    proxima: r.proxima
      ? {
          valor: r.proxima.valor,
          fecha: r.proxima.fecha,
          diasQueFaltan: Math.max(0, diasEntre(hoy, r.proxima.fecha)),
        }
      : null,
    vencidoCop: r.vencidoCop,
    cuotasVencidas: r.cuotasVencidas,
    restaPorPagar: r.restaPorPagar,
    enMora: r.enMora,
    diasDeMora: r.diasDeMora,
  };
}

/**
 * Días hasta el día de pago del mes, o `null` si el arriendo no lo trae.
 *
 * Los migrados llegan sin `paymentDay`: `new Date(a, m, undefined)` es
 * `Invalid Date` y de ahí salía el «Vence en NaN días». Sin día, no se afirma
 * un vencimiento.
 */
export function diasHastaElDiaDePago(paymentDay: unknown, hoy: Date): number | null {
  if (typeof paymentDay !== 'number' || !Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    return null;
  }
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let vence = new Date(base.getFullYear(), base.getMonth(), paymentDay);
  if (vence < base) vence = new Date(base.getFullYear(), base.getMonth() + 1, paymentDay);
  return Math.round((vence.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
}
