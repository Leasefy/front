/**
 * La forma del ADELANTO — qué parte del pago se puede dejar como anticipo del
 * contrato, para decirlo en el diálogo del recibo ANTES de emitir.
 *
 * ── La regla del negocio (Juan Camilo, 2026-09-16) ──────────────────────────
 * Cuando el monto alcanza cuotas que todavía no vencen, caja elige:
 *   (a) «puede generar de una vez el recibo de caja con toda la factura de los
 *       meses que pagó por anticipado» — abonar ya a esas cuotas;
 *   (b) «le haría un anticipo, y para cada período mensual le voy facturando y
 *       descontando con un recibo de caja de ese anticipo hasta que el
 *       anticipo se vuelva a cero».
 *
 * Es una COPIA de la regla del back (`anticipo-del-contrato.ts`,
 * `esAdelantableComoAnticipo`), sólo para mostrar: lo que queda escrito es lo
 * que el back devuelve.
 */

import type { CarteraDelCliente, PeriodoEnDeuda } from '@/lib/api/recibos-de-caja.types';
import type { Imputacion } from './imputar-pago';

/** ¿Este período se puede dejar como anticipo? Futuro y de una cuota de contrato. */
export function esAdelantableComoAnticipo(p: PeriodoEnDeuda): boolean {
  return p.vencida === false && p.cuotaId !== null && (p.contractId ?? null) !== null;
}

export interface MesQueSeAdelanta {
  month: string;
  valorCop: number;
  /** `false` cuando el pago no alcanza el mes entero. */
  completo: boolean;
}

/**
 * Los meses que el plan le abona a cuotas que todavía no vencen, en orden, y
 * cuánto suma eso. Vacío cuando el pago sólo cubre lo vencido: ahí no hay nada
 * que elegir.
 */
export function mesesQueSeAdelantan(
  cartera: CarteraDelCliente | null,
  plan: Imputacion,
): { meses: MesQueSeAdelanta[]; valorCop: number } {
  if (!cartera) return { meses: [], valorCop: 0 };
  const porId = new Map(cartera.cuotas.map((c) => [c.id, c]));
  const meses = plan.partes
    .filter((parte) => {
      const periodo = porId.get(parte.id);
      return periodo !== undefined && esAdelantableComoAnticipo(periodo);
    })
    .map((parte) => ({
      month: parte.month,
      valorCop: parte.valorCop,
      completo: parte.quedaPendiente === 0,
    }));
  return { meses, valorCop: meses.reduce((s, m) => s + m.valorCop, 0) };
}

/**
 * ¿Se le ofrece a caja elegir la forma? Sólo si el pago alcanza cuotas futuras
 * Y el back puede guardar el anticipo (la migración está). Si no, el pago se
 * registra como siempre y no hay nada que preguntar.
 */
export function seOfreceElegirLaForma(
  cartera: CarteraDelCliente | null,
  plan: Imputacion,
): boolean {
  return (
    cartera?.anticipoDelContratoDisponible === true &&
    mesesQueSeAdelantan(cartera, plan).meses.length > 0
  );
}
