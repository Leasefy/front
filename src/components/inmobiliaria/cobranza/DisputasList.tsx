'use client'

/**
 * DisputasList — columna izquierda del maestro-detalle de Disputas.
 *
 * Cada fila es lo mínimo para ELEGIR: quién, en qué estado, cuánto y hace
 * cuánto. El motivo —que es lo que de verdad hay que leer— vive en el panel de
 * la derecha, no acá: recortarlo en la fila obligaría a abrir cada una para
 * saber de qué se trata.
 *
 * Antes esto eran tarjetas a lo ancho con `max-w-3xl`, y la mitad derecha de la
 * pantalla quedaba vacía.
 */


import { Badge } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { CobranzaDispute } from '@/lib/hooks/cobranza/use-disputes'
import {
  DISPUTE_ESTADO,
  asDisputeStatus,
  debtorLabel,
  outcomeLabel,
} from '@/lib/cobranza/dispute-vocab'

export interface DisputasListProps {
  disputes: CobranzaDispute[]
  selectedId: string | null
  onSelect: (dispute: CobranzaDispute) => void
}

export function DisputasList({
  disputes,
  selectedId,
  onSelect,
}: DisputasListProps) {
  const { formatCurrency, formatRelativeDate } = useI18n()

  return (
    <ul className="divide-y divide-border" aria-label="Disputas">
      {disputes.map((d) => {
        const estado = DISPUTE_ESTADO[asDisputeStatus(d.status)]
        const seleccionada = d.id === selectedId
        const resultado = outcomeLabel(d)
        return (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onSelect(d)}
              aria-current={seleccionada ? 'true' : undefined}
              data-testid={`disputa-fila-${d.id}`}
              className={cn(
                'w-full text-left px-4 py-3 space-y-1.5 transition-colors',
                'focus-visible:outline-none focus-visible:bg-surface-muted',
                seleccionada
                  ? 'bg-surface-muted border-l-2 border-l-primary'
                  : 'border-l-2 border-l-transparent hover:bg-surface-muted/60',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-fg truncate min-w-0">
                  {debtorLabel(d)}
                </span>
                <Badge variant={estado.variant} className="shrink-0">
                  {estado.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <span className="font-mono tabular-nums">
                  {d.disputed_amount != null
                    ? formatCurrency(d.disputed_amount)
                    : 'Sin monto'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatRelativeDate(d.opened_at)}</span>
                {resultado && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{resultado}</span>
                  </>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
