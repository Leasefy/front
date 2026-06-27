'use client'

/**
 * AvaluoEstadoCard — displays the current status of a submitted avalúo
 * and renders the appropriate CTA for each lifecycle state.
 *
 * Status → CTA mapping:
 *   firmado   + certId → "Pagar certificado" (startPayment → redirect to Wompi)
 *   pagado    + certId → "Descargar certificado" (certificateUrl with cap token)
 *   entregado + certId → same as pagado + "Verificar certificado" link
 *   rechazado          → destructive note
 *   other              → processing message
 *
 * Capability token is read from localStorage (avaluo:cap:<submissionId>).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowSquareOut,
  ArrowsClockwise,
  SealCheck,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TERMINAL_STATUSES, STATUS_BADGE } from '@/lib/types/avaluo'
import type { AvaluoStatusResponse } from '@/lib/types/avaluo'
import { startPayment, certificateUrl, readCapToken } from '@/lib/api/avaluo.service'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AvaluoEstadoCardProps {
  submissionId: string
  statusData: AvaluoStatusResponse | null
  isLoading: boolean
  /** Optional: set when useAvaluoStatus surfaces an error */
  isError?: boolean
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function EstadoSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-32 rounded-full bg-muted" />
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="h-10 w-40 rounded-md bg-muted" />
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
  isError,
}: AvaluoEstadoCardProps) {
  const [isPaying, setIsPaying] = useState(false)

  // While loading and no data yet — show skeleton
  if (isLoading && !statusData) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <EstadoSkeleton />
      </section>
    )
  }

  if (!statusData) {
    if (isError) {
      return (
        <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 space-y-2">
          <div className="flex items-start gap-3">
            <WarningCircle className="w-5 h-5 text-destructive flex-none mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                No pudimos obtener el estado del avalúo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Verificá tu conexión. La página se actualiza automáticamente.
              </p>
            </div>
          </div>
        </section>
      )
    }
    return null
  }

  const { status, certId, slug } = statusData
  const badge = STATUS_BADGE[status]
  const isTerminal = TERMINAL_STATUSES.includes(status)

  // Read cap token from localStorage for download links
  const capToken = readCapToken(submissionId)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePay = async () => {
    if (!certId) return
    setIsPaying(true)
    try {
      const { url } = await startPayment(certId)
      window.location.href = url
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'No pudimos iniciar el pago. Intentá de nuevo.'
      toast.error(msg)
      setIsPaying(false)
    }
  }

  const handleDownloadCertificate = () => {
    if (!certId || !capToken) {
      toast.error('No encontramos tu token de acceso. Intentá desde el mismo navegador donde solicitaste el avalúo.')
      return
    }
    const url = certificateUrl(certId, capToken)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ---------------------------------------------------------------------------
  // CTA section per status
  // ---------------------------------------------------------------------------

  let cta: React.ReactNode = null

  if (status === 'firmado' && certId) {
    cta = (
      <Button
        size="lg"
        isLoading={isPaying}
        onClick={handlePay}
        className="w-full sm:w-auto"
      >
        Pagar certificado
      </Button>
    )
  } else if (status === 'pagado' && certId) {
    cta = (
      <Button
        size="lg"
        variant="outline"
        onClick={handleDownloadCertificate}
        className="w-full sm:w-auto inline-flex items-center gap-2"
      >
        <ArrowDown className="w-4 h-4" />
        Descargar certificado
      </Button>
    )
  } else if (status === 'entregado' && certId) {
    cta = (
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          variant="outline"
          onClick={handleDownloadCertificate}
          className="inline-flex items-center gap-2"
        >
          <ArrowDown className="w-4 h-4" />
          Descargar certificado
        </Button>
        {slug && (
          <a
            href={`/avaluo/verificar/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline self-center"
          >
            <ArrowSquareOut className="w-4 h-4" />
            Verificar certificado
          </a>
        )}
      </div>
    )
  } else if (status === 'rechazado') {
    cta = (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <WarningCircle className="w-5 h-5 text-destructive flex-none mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">Avalúo rechazado</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SealCheck className="w-4 h-4 flex-none" />
        <span>Estamos procesando tu avalúo</span>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-5">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <Badge variant={badge.variant as React.ComponentProps<typeof Badge>['variant']}>
          {badge.label}
        </Badge>
        {isError && (
          <span className="text-xs text-muted-foreground">
            (último dato conocido — reconectando…)
          </span>
        )}
      </div>

      {/* Last updated */}
      {statusData.updatedAt && (
        <p className="text-xs text-muted-foreground">
          Última actualización:{' '}
          {new Date(statusData.updatedAt).toLocaleString('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}

      {/* CTA */}
      <div>{cta}</div>

      {/* Auto-refresh hint for non-terminal states */}
      {!isTerminal && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowsClockwise className="w-3.5 h-3.5" />
          Se actualiza automáticamente
        </p>
      )}
    </section>
  )
}
