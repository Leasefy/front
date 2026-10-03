/**
 * CLIENT-SAFE Wompi rent-session helpers.
 *
 * This module is imported by the server route AND by the 'use client'
 * PayRentModal (v7-04-02), so it must stay free of server-only dependencies:
 * NO node:crypto, NO 'server-only', NO next/server. The integrity hash lives
 * in the sibling server-only module `./wompi-integrity`, never here.
 */

import type { CurrentPeriodStatus } from '@/lib/api/leases.types'

export type { CurrentPeriodStatus }

/**
 * Period statuses for which a new rent payment may be started.
 * NONE  → nothing yet for the period → can pay.
 * REJECTED → last request was rejected → can retry.
 * APPROVED / PENDING_VALIDATION are intentionally excluded (no double-pay).
 */
export const PAYABLE_PERIOD_STATUSES = ['NONE', 'REJECTED'] as const

/** True only when the current period is payable (NONE or REJECTED). */
export function isPeriodPayable(status: CurrentPeriodStatus): boolean {
  return (PAYABLE_PERIOD_STATUSES as readonly string[]).includes(status)
}

/**
 * Rent payment reference: rent-namespaced, so rent and avalúo references never
 * collide during reconciliation (RESEARCH §1 invariant 5). Month is
 * zero-padded to 2 digits.
 *
 * ── Una referencia por intento (Nico, 02-10-2026, «seguimiento 4») ────────────
 *
 * Antes era la MISMA para todos los intentos del período
 * (`rent-<leaseId>-AAAA-MM`): un segundo intento (después de un rechazo, o de
 * cerrar el checkout) volvía a Wompi con una referencia ya usada. Ahora cada
 * sesión de pago lleva su marca de tiempo (`-<epochMs>`, la misma forma de
 * `lease-`). El back ya la entiende
 * (`back/src/tenant-payments/wompi/referencia-del-arriendo.ts`: sufijo de 10 a
 * 16 dígitos) y cierra el MISMO período; el doble pago lo frena el back (un
 * pago por período) y el período «en verificación» mientras hay uno en curso.
 *
 * buildRentReference('L1', 2026, 7, 1759449600123) === 'rent-L1-2026-07-1759449600123'
 */
export function buildRentReference(
  leaseId: string,
  year: number,
  month: number,
  intento: number = Date.now()
): string {
  return `rent-${leaseId}-${year}-${String(month).padStart(2, '0')}-${Math.trunc(intento)}`
}

/** Session params returned by the server route to the client. */
export interface WompiRentSession {
  reference: string
  amountInCents: number
  currency: string
  integrity: string
  publicKey: string
}

/**
 * Builds the Wompi hosted-checkout URL (client-side redirect target).
 *
 * Param names and order follow the Wompi Web Checkout spec, verified against
 * the two live server-side siblings that already build this same URL shape —
 * `src/app/api/avaluo/wompi-session/route.ts` and
 * `src/app/api/inquilino/acuerdos/wompi-session/route.ts`: note the
 * `signature:integrity=` param name (NOT `integrity=`) and the URL-encoded
 * redirect-url.
 */
export function buildWompiCheckoutUrl(p: {
  publicKey: string
  currency: string
  amountInCents: number
  reference: string
  integrity: string
  redirectUrl: string
}): string {
  return (
    'https://checkout.wompi.co/p/?public-key=' +
    p.publicKey +
    '&currency=' +
    p.currency +
    '&amount-in-cents=' +
    p.amountInCents +
    '&reference=' +
    p.reference +
    '&signature:integrity=' +
    p.integrity +
    '&redirect-url=' +
    encodeURIComponent(p.redirectUrl)
  )
}
