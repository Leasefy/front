/**
 * «Estado general» del arriendo en el portal del inquilino.
 *
 * 🔴 QA con avatares 04-10: «Mi arriendo» decía «Al día — Pago del período
 * confirmado» y «Pagos» «Tu pago de este mes ya está al día» mientras la misma
 * pantalla mostraba $6.050.000 vencidos en 3 cuotas. El estado salía sólo del
 * pago del período, no de la deuda.
 *
 * La deuda nace con el contrato y su documento es el estado de cuenta, así que
 * el estado sale de las cuotas (la misma fuente que «Mi estado de cuenta»).
 * Sin plazo fijado no corre interés y la cuota queda «Vencida» (no «en mora»),
 * pero SIGUE siendo deuda vencida y por eso no está «al día».
 */

import { formatCurrency } from '@/lib/format';
import type { ResumenDePagos } from './resumen-de-pagos';

export type PeriodoDelPago = 'APPROVED' | 'PENDING_VALIDATION' | 'REJECTED' | 'NONE' | string | undefined | null;

export type TonoDelEstado = 'ok' | 'espera' | 'peligro' | 'neutro';

export interface EstadoGeneral {
  etiqueta: string;
  detalle: string;
  tono: TonoDelEstado;
}

/**
 * COLA-04 (QA-PAGOS-95, 05-10-2026): la plata con el formateador común
 * («$ 6.050.000», espacio duro; centavos sólo si los trae y la llave está
 * prendida), no con un `'$' + toLocaleString` propio que redondeaba y escribía
 * «$6.050.000» al lado de las cifras de la misma pantalla.
 */
function pesos(n: number): string {
  return formatCurrency(n);
}

/** Frase corta con lo vencido, o `null` si no hay nada vencido. */
export function fraseDeLoVencido(resumen: ResumenDePagos | null): string | null {
  if (!resumen || resumen.cuotasVencidas <= 0 || resumen.vencidoCop <= 0) return null;
  const n = resumen.cuotasVencidas;
  return `${pesos(resumen.vencidoCop)} vencidos en ${n} ${n === 1 ? 'cuota' : 'cuotas'}`;
}

export function estadoGeneralDelArriendo(
  periodo: PeriodoDelPago,
  resumen: ResumenDePagos | null,
  /** Lo que dijo la inmobiliaria al rechazar el pago del período (si lo dijo). */
  motivoDelRechazo?: string | null,
): EstadoGeneral | null {
  const vencido = fraseDeLoVencido(resumen);
  // Lo vencido manda sobre cualquier pago del período: hay deuda, no está al día.
  if (vencido && periodo !== 'PENDING_VALIDATION') {
    return { etiqueta: 'Con saldo vencido', detalle: vencido, tono: 'peligro' };
  }
  switch (periodo) {
    case 'APPROVED':
      // Sin el estado de cuenta no se afirma «al día»: sólo lo que sí se sabe.
      return resumen
        ? { etiqueta: 'Al día', detalle: 'Sin cuotas vencidas', tono: 'ok' }
        : { etiqueta: 'Pago del mes recibido', detalle: 'Pago del período confirmado', tono: 'ok' };
    case 'PENDING_VALIDATION':
      return {
        etiqueta: 'En verificación',
        detalle: vencido ? `Pago en validación · ${vencido}` : 'Pago en proceso de validación',
        tono: 'espera',
      };
    case 'REJECTED':
      return {
        etiqueta: 'Pago rechazado',
        detalle: motivoDelRechazo?.trim() || 'Revisa el estado de cuenta',
        tono: 'peligro',
      };
    case 'NONE':
      return { etiqueta: 'Pendiente', detalle: 'Pago del período pendiente', tono: 'neutro' };
    default:
      return null;
  }
}

/** «Día 5», o `null` si el arriendo no trae el día de pago (los migrados no lo traen). */
export function diaDePagoLegible(paymentDay: unknown): string | null {
  if (typeof paymentDay !== 'number' || !Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    return null;
  }
  return `Día ${paymentDay}`;
}
