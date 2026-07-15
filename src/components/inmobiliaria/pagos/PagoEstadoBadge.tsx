/**
 * PagoEstadoBadge — pill NO interactivo de estado de pago.
 *
 * Es una etiqueta de estado (no un botón ni un chip), así que el pill
 * (`rounded-full`) está permitido por el contrato de UI (§3: Badge/StatusBadge
 * → estado no interactivo, "acá sí pill"). Consume el vocabulario de tokens de
 * src/lib/pagos/estados.ts — CERO hex inline.
 */

import { cn } from '@/lib/utils'
import { estadoPagoClasses, estadoPagoLabel, type PagoEstado } from '@/lib/pagos/estados'

export interface PagoEstadoBadgeProps {
  /** Estado del pago. Acepta string para degradar con gracia ante valores fuera de contrato. */
  estado: PagoEstado | string
  className?: string
}

export function PagoEstadoBadge({ estado, className }: PagoEstadoBadgeProps) {
  const c = estadoPagoClasses(estado)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        c.text,
        c.bg,
        c.border,
        className,
      )}
    >
      {estadoPagoLabel(estado)}
    </span>
  )
}
