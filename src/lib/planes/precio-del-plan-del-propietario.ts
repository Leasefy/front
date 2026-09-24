/**
 * EL PRECIO del plan del propietario lo dice el BACK. Una sola fuente.
 *
 * 🔴 QA 23-09: el checkout del propietario mostraba «$149.900/mes» y
 * «$1.439.000/año» desde `PLANS` (constantes del front) mientras el back
 * cobraba $149.000 y $1.430.000 (`SubscriptionPlanConfig`, lo que lee
 * `startPseCheckout`). La persona aceptaba una cifra y el banco le pedía otra.
 *
 * `PLANS` conserva lo que es del front (nombre, descripción, rasgos, orden) y
 * deja el precio de los planes pagos en `null`; acá se le pone el del back,
 * emparejando por `tier` (el slug, contrato 29). Un plan que el back no trae
 * se queda en `null` y la pantalla dice «—»: nunca un «$ 0» (eso hace
 * `formatCurrency(null)`), que se leería como gratis.
 */

import { formatCurrency } from '@/lib/format';
import type { Plan } from '@/lib/types/subscription';

export interface PrecioDelBack {
  tier: string;
  monthlyPrice: number;
  annualPrice: number;
}

export function conPrecioDelBack(plan: Plan, delBack: readonly PrecioDelBack[]): Plan {
  const fila = delBack.find((p) => p.tier?.toLowerCase() === plan.id.toLowerCase());
  if (!fila) return plan;
  return {
    ...plan,
    price: { monthly: fila.monthlyPrice, yearly: fila.annualPrice },
  };
}

/** El precio para pintar: la cifra del back, o «—» mientras no se sepa. */
export function precioLegible(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? formatCurrency(valor) : '—';
}
