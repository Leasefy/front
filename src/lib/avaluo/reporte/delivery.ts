/**
 * delivery.ts — el ÚNICO lugar donde se resuelven las capacidades de entrega
 * del informe (T-0007 §3.2.3). Todo lo que la landing muestra u oculta por
 * sign-off pasa por `resolveDelivery`; nadie más lee `ReportServeResponse['delivery']`
 * directamente.
 *
 * La regla de todo este archivo: `delivery` ausente o roto ⇒ el modo MÁS
 * restrictivo. Nunca al revés. El parser (`report-serve.schema.ts`) ya
 * degrada cualquier forma inválida a `undefined` — acá sólo queda decidir qué
 * significa `undefined`, y eso es: nada de PDF, nada de verificar, nada de
 * exportar, y el aviso de reserva.
 */

import { FALLBACK_ESTIMATE_NOTICE } from './delivery-copy'
import type { ReportServeResponse } from './report-serve.schema'

/**
 * La proyección que consume la UI. A diferencia de `DeliveryCapabilities`
 * (el tipo del wire), acá `signoffState` puede ser `null` (delivery ausente:
 * no hay ningún estado que mostrar) y `estimateNotice` SIEMPRE es un string
 * cuando `released` es `false` — nunca queda un aviso vacío.
 */
export interface DeliveryCapabilitiesView {
  readonly signoffState: string | null
  readonly released: boolean
  readonly canDownloadPdf: boolean
  readonly canVerify: boolean
  readonly canExport: boolean
  readonly estimateNotice: string | null
}

/** El modo más restrictivo: nada es posible, y se muestra el aviso de reserva. */
export const DENIED: DeliveryCapabilitiesView = {
  signoffState: null,
  released: false,
  canDownloadPdf: false,
  canVerify: false,
  canExport: false,
  estimateNotice: FALLBACK_ESTIMATE_NOTICE,
}

/**
 * El único gate. `parsed.delivery` ausente ⇒ `DENIED`. Presente pero
 * `released:false` ⇒ se re-clampan las tres capacidades a `false` aunque el
 * productor mandara alguna en `true` (defensa en profundidad, T-0007 §3.2.3).
 * `released:true` ⇒ se respetan las capacidades del productor, con
 * `canVerify` recortado por el AND con `meta.verifyUrlEnabled` (el eco propio
 * del productor, doble cinturón).
 */
export function resolveDelivery(parsed: ReportServeResponse): DeliveryCapabilitiesView {
  const d = parsed.delivery
  if (d === undefined) return DENIED

  if (!d.released) {
    return {
      signoffState: d.signoffState,
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: d.estimateNotice ?? FALLBACK_ESTIMATE_NOTICE,
    }
  }

  return {
    signoffState: d.signoffState,
    released: true,
    canDownloadPdf: d.canDownloadPdf,
    canVerify: d.canVerify && parsed.meta.verifyUrlEnabled,
    canExport: d.canExport,
    estimateNotice: d.estimateNotice,
  }
}
