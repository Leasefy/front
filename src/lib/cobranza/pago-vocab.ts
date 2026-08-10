/**
 * pago-vocab.ts — cómo se DICE el estado de un pago en pantalla.
 *
 * Mismo rol que `dispute-vocab.ts` y `acuerdo-vocab.ts`. Vive aparte porque la
 * decisión que traduce no es cosmética.
 *
 * ── El problema ────────────────────────────────────────────────────────────
 * `agent.payments` guarda dos hechos distintos bajo `status = 'pending'`:
 *
 *   obligación → la fila la escribió el import de cartera. Nadie intentó
 *                pagarla; es lo que el deudor DEBE.
 *   pago       → alguien generó un link o registró un abono y la pasarela
 *                todavía no confirma. Es plata en camino.
 *
 * Las dos se pintaban «Pendiente» en ámbar, así que la agencia demo mostraba
 * 45 advertencias sobre una cartera donde no había entrado un peso. El
 * endpoint las separa con `kind`; acá se les da nombre y color.
 *
 * Una deuda NO es una advertencia: es el estado normal de la cartera. El ámbar
 * queda para el único caso que pide atención — el pago que no confirma.
 */

import type { BadgeProps } from '@/components/ui'
import type { PaymentsFunnelItem } from '@/lib/hooks/cobranza/use-payments-funnel'

/** Variantes del adaptador local — ver la nota en `acuerdo-vocab.ts`. */
type BadgeVariant = NonNullable<BadgeProps['variant']>

/**
 * Los estados como los ve el operador. NO son los de la columna `status`:
 * `porCobrar` y `enProceso` salen los dos de `pending`.
 */
export type EstadoVisible = 'porCobrar' | 'enProceso' | 'approved' | 'declined' | 'disbursed'

/** Orden de los chips: sigue el recorrido de la plata, no el alfabeto. */
export const ESTADOS_VISIBLES: EstadoVisible[] = [
  'porCobrar',
  'enProceso',
  'approved',
  'declined',
  'disbursed',
]

/** Valor que espera el filtro `status` del endpoint para cada estado visible. */
export const ESTADO_A_FILTRO: Record<EstadoVisible, string> = {
  porCobrar: 'por_cobrar',
  enProceso: 'en_proceso',
  approved: 'approved',
  declined: 'declined',
  disbursed: 'disbursed',
}

/** Qué es realmente esta fila, más allá de lo que diga `status`. */
export function estadoVisible(
  row: Pick<PaymentsFunnelItem, 'status' | 'kind'>,
): EstadoVisible {
  if (row.status !== 'pending') return row.status
  return row.kind === 'obligacion' ? 'porCobrar' : 'enProceso'
}

/**
 * Estado → variant del Badge del adaptador local.
 *
 * Antes `pending` era `warning` para todo. Ahora el ámbar señala lo único que
 * de verdad pide atención: la plata que salió del deudor y la pasarela no
 * confirmó.
 *
 * ⚠️ `porCobrar` va en `outline`, NO en `secondary`, y es a propósito.
 * `secondary` cae en el variant `neutral` de Cadence, que está escrito en hex
 * crudo (`bg-[#F1EFEB] text-[#4D4A45]`) y por eso NO sigue el modo oscuro: en
 * oscuro quedan 45 pastillas beige brillando sobre la tabla negra. `outline`
 * usa tokens (`border-border` + `text-fg-muted`) y se adapta.
 *
 * El arreglo de fondo va en `~/rent/cadence`: los tokens `--surface-muted` y
 * `--fg-muted` YA valen `#f4f2ef` / `#6e6a63`, que es exactamente la paleta
 * neutra que el propio Badge documenta en su comentario. La variante los
 * ignoró y escribió otro hex a mano. Es una release del DS, no de acá.
 */
export function estadoBadgeVariant(estado: EstadoVisible): BadgeVariant {
  switch (estado) {
    case 'approved':
      return 'success'
    case 'porCobrar':
      return 'outline'
    case 'enProceso':
      return 'warning'
    case 'declined':
      return 'destructive'
    case 'disbursed':
      return 'secondary'
  }
}
