'use client'

/**
 * AvaluoEstadoCard — displays the current status of a submitted avalúo
 * and renders the appropriate CTA for each lifecycle state.
 *
 * - firmado   → WompiPayButton (only place this button appears)
 * - entregado → download + verify links
 * - rechazado → destructive note
 * - other     → processing message
 *
 * Shows an "auto-refreshing" hint for non-terminal states.
 */

import { ArrowDown, ArrowSquareOut, ArrowsClockwise, SealCheck, WarningCircle } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { WompiPayButton } from '@/components/avaluo/WompiPayButton'
import { TERMINAL_STATUSES, STATUS_BADGE } from '@/lib/types/avaluo'
import type { AvaluoStatusResponse } from '@/lib/types/avaluo'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AvaluoEstadoCardProps {
  submissionId: string
  statusData: AvaluoStatusResponse | null
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function EstadoSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32 rounded-full" />
      <Skeleton className="h-4 w-48 rounded-[8px]" />
      <Skeleton className="h-10 w-40 rounded-full" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AvaluoEstadoCard({
  submissionId,
  statusData,
  isLoading,
}: AvaluoEstadoCardProps) {
  // While loading and no data yet — show skeleton
  if (isLoading && !statusData) {
    return (
      <Card className="rounded-[22px] p-6 space-y-4">
        <EstadoSkeleton />
      </Card>
    )
  }

  if (!statusData) return null

  const { status } = statusData
  const badge = STATUS_BADGE[status]
  const isTerminal = TERMINAL_STATUSES.includes(status)

  // ---------------------------------------------------------------------------
  // CTA section per status
  // ---------------------------------------------------------------------------

  let cta: React.ReactNode = null

  if (status === 'firmado') {
    // ONLY here does WompiPayButton appear
    cta = <WompiPayButton submissionId={submissionId} />
  } else if (status === 'entregado') {
    cta = (
      <div className="flex flex-col sm:flex-row gap-3">
        {statusData.downloadUrl && (
          <a
            href={statusData.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowDown className="w-4 h-4" />
            Descargar certificado
          </a>
        )}
        {statusData.slug && (
          <a
            href={`/avaluo/verificar/${statusData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowSquareOut className="w-4 h-4" />
            Verificar certificado
          </a>
        )}
      </div>
    )
  } else if (status === 'rechazado') {
    cta = (
      <div className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger-soft p-4">
        <WarningCircle className="w-5 h-5 text-danger flex-none mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-danger">Avalúo rechazado</p>
          <p className="text-xs text-fg-muted leading-relaxed">
            No fue posible procesar tu solicitud. Si crees que esto es un error,
            contáctanos a{' '}
            <a href="mailto:avaluos@leasefy.co" className="underline">
              avaluos@leasefy.co
            </a>
            .
          </p>
        </div>
      </div>
    )
  } else {
    cta = (
      <div className="flex items-center gap-2 text-sm text-fg-muted">
        <SealCheck className="w-4 h-4 flex-none" />
        <span>Estamos procesando tu avalúo</span>
      </div>
    )
  }

  return (
    <Card className="rounded-[22px] p-6 space-y-5">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <Badge variant={badge.variant as React.ComponentProps<typeof Badge>['variant']}>
          {badge.label}
        </Badge>
      </div>

      {/* Last updated */}
      {statusData.updatedAt && (
        <p className="text-xs text-fg-muted">
          Última actualización:{' '}
          <span className="font-mono tabular-nums">
            {new Date(statusData.updatedAt).toLocaleString('es-CO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </p>
      )}

      {/* CTA */}
      <div>{cta}</div>

      {/* Auto-refresh hint for non-terminal states */}
      {!isTerminal && (
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <ArrowsClockwise className="w-3.5 h-3.5" />
          Se actualiza automáticamente
        </p>
      )}
    </Card>
  )
}
