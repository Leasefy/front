/**
 * El saldo a favor que el inquilino YA tiene en su contrato, en el recibo de
 * caja (Juan, 31-10-2026): «como el inquilino pagó [la factura de servicios de
 * entrada]… se le va a hacer una deducción de 177.419… El recibo de caja
 * debería aparecer menos ese valor, él ya pagó».
 *
 * Ese saldo es un anticipo del contrato: el back lo descuenta SOLO, con su
 * propio recibo, el día de pago de cada cuota (`consumo-del-anticipo`, cada
 * noche). Así que lo que caja le recibe a la persona es la deuda MENOS lo que
 * ese anticipo va a cubrir: cobrarle la cuota entera dejaría el anticipo
 * esperando el mes siguiente y le cobraría dos veces la misma plata.
 *
 * Puro: sólo lee la cartera que manda el back. Un contrato sin deuda no
 * descuenta nada (el anticipo espera a su cuota).
 */

import type { CarteraDelCliente } from '@/lib/api/recibos-de-caja.types';

export interface SaldoAFavorEnElRecibo {
  /** Todo lo que la persona tiene a favor en sus contratos. */
  saldoCop: number;
  /** De lo vencido, lo que el anticipo cubre (contrato por contrato). */
  deLoVencidoCop: number;
  /** De toda la deuda, lo que el anticipo cubre (contrato por contrato). */
  deTodaLaDeudaCop: number;
}

export function saldoAFavorEnElRecibo(
  cartera: Pick<CarteraDelCliente, 'cuotas' | 'anticiposDelContrato'> | null,
): SaldoAFavorEnElRecibo {
  const r: SaldoAFavorEnElRecibo = { saldoCop: 0, deLoVencidoCop: 0, deTodaLaDeudaCop: 0 };
  for (const a of cartera?.anticiposDelContrato ?? []) {
    if (!(a.saldoCop > 0)) continue;
    const delContrato = cartera!.cuotas.filter((c) => c.contractId === a.contractId);
    const vencido = delContrato.filter((c) => c.vencida).reduce((s, c) => s + c.pendingAmount, 0);
    const todo = delContrato.reduce((s, c) => s + c.pendingAmount, 0);
    r.saldoCop += a.saldoCop;
    r.deLoVencidoCop += Math.min(a.saldoCop, vencido);
    r.deTodaLaDeudaCop += Math.min(a.saldoCop, todo);
  }
  return r;
}
