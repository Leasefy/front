/**
 * En qué estado está la deuda de un cliente, leída de su estado de cuenta.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * Nico (2026-09-15): «Desde que él comience el contrato ya debe. […] Otra cosa
 * es que se tarde en pagar sobre los días máximos de mora, y ahí ya es cartera».
 * La deuda vive en las cuotas del contrato; el cobro es el documento con que se
 * reclama y puede no existir. Una pantalla que saca el saldo de los cobros dice
 * «—» o «al día» en la inmobiliaria migrada, que tiene cero cobros y miles de
 * cuotas pendientes.
 *
 * Tres estados, con las mismas palabras de Pagos y de Cartera:
 *
 *   · **Al día** — no hay nada vencido sin pagar. Puede deber cuotas futuras: la
 *     deuda del contrato no es mora.
 *   · **Vencido, en plazo** — venció, pero el plazo del contrato sigue
 *     corriendo. Es deuda, no cartera: ni corre interés ni lo toca la cobranza.
 *   · **En cartera** — pasó el vencimiento MÁS los días de plazo.
 *
 * La frontera no se decide acá: la trae el back en `enMora`, que sólo cuenta lo
 * que pasó el plazo (`cuota-es-cartera.ts`). Esto sólo la nombra.
 */

import type { ResumenDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export type EstadoDeLaDeuda =
  | { tipo: 'AL_DIA' }
  | { tipo: 'VENCIDO_EN_PLAZO'; vencidoCop: number }
  | {
      tipo: 'EN_CARTERA';
      vencidoCop: number;
      /** Lo que ya pasó el plazo. Puede ser menos que lo vencido. */
      carteraCop: number;
      /** Días de mora de la cuota en cartera más vieja. */
      dias: number;
    };

/** El estado de la deuda de un resumen del estado de cuenta. */
export function estadoDeLaDeuda(resumen: ResumenDelEstadoDeCuenta): EstadoDeLaDeuda {
  // `enMora` manda: si el back dice que hay cartera, la hay, aunque `pendiente`
  // venga en cero por un redondeo o un corte de fecha distinto.
  if (resumen.enMora) {
    return {
      tipo: 'EN_CARTERA',
      vencidoCop: Math.max(resumen.pendiente, resumen.enMora.monto),
      carteraCop: resumen.enMora.monto,
      dias: resumen.enMora.dias,
    };
  }
  if (resumen.pendiente > 0) {
    return { tipo: 'VENCIDO_EN_PLAZO', vencidoCop: resumen.pendiente };
  }
  return { tipo: 'AL_DIA' };
}
