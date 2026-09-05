'use client'

/**
 * AvaluoEstadoCard — displays the current status of a submitted avalúo
 * and renders the appropriate CTA for each lifecycle state.
 *
 * Status → CTA mapping:
 *   firmado + certId + paid   → "Ver el informe" (la landing web del informe,
 *                                el ENTREGABLE principal) + "Descargar el PDF"
 *                                (payment already happened at intake)
 *   firmado + certId + !paid  → honest pending note + enlace al informe (la
 *                                landing muestra lo público y el estado del pago)
 *   entregado + certId → same as firmado+paid + "Verificar certificado" link
 *   (`pagado` is not a real state — the micro's state machine has five
 *   members, not six; see `AvaluoStatus` in lib/types/avaluo.ts, T-0007)
 *   rechazado          → destructive note
 *   other              → processing message
 *
 * El informe web (`/avaluo/reporte/[slug]?token=`) es la entrega principal del
 * avalúo: el capability token viaja en la query como en `certificateUrl` (es
 * el mismo secreto del dueño y la landing lo canjea server-side contra el
 * micro). El PDF queda como descarga secundaria.
 *
 * Capability token is read from localStorage (avaluo:cap:<submissionId>).
 */

import { toast } from '@/components/ui/toast'
import {
  ArrowDown,
  ArrowSquareOut,
  ArrowsClockwise,
  FileText,
  SealCheck,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TERMINAL_STATUSES, STATUS_BADGE } from '@/lib/types/avaluo'
import type { AvaluoStatusResponse } from '@/lib/types/avaluo'
import { certificateUrl, readCapToken } from '@/lib/api/avaluo.service'
import { reporteAvaluoHref } from '@/lib/avaluo/reporte-href'

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
  isError,
}: AvaluoEstadoCardProps) {
  // While loading and no data yet — show skeleton
  if (isLoading && !statusData) {
    return (
      <Card className="rounded-[22px] p-6 space-y-4">
        <EstadoSkeleton />
      </Card>
    )
  }

  if (!statusData) {
    if (isError) {
      return (
        <Card className="rounded-[22px] border-danger/20 bg-danger-soft p-6 space-y-2">
          <div className="flex items-start gap-3">
            <WarningCircle className="w-5 h-5 text-danger flex-none mt-0.5" />
            <div>
              <p className="text-sm font-medium text-danger">
                No pudimos obtener el estado del avalúo
              </p>
              <p className="text-xs text-fg-muted mt-1">
                Verificá tu conexión. La página se actualiza automáticamente.
              </p>
            </div>
          </div>
        </Card>
      )
    }
    return null
  }

  const { status, certId, slug, paid } = statusData
  const badge = STATUS_BADGE[status]
  const isTerminal = TERMINAL_STATUSES.includes(status)

  // Read cap token from localStorage for download links
  const capToken = readCapToken(submissionId)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDownloadCertificate = () => {
    if (!certId || !capToken) {
      toast.error('No encontramos tu token de acceso. Intentá desde el mismo navegador donde solicitaste el avalúo.')
      return
    }
    const url = certificateUrl(certId, capToken)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // El informe web: la entrega principal. Necesita el slug (viaja con el
  // certId en el status) y el capability token del dueño.
  const reportHref = slug && capToken ? reporteAvaluoHref(slug, capToken) : null

  const verInformeButton = reportHref !== null && (
    <Button asChild size="lg" className="inline-flex items-center gap-2">
      <a href={reportHref} target="_blank" rel="noopener noreferrer">
        <FileText className="w-4 h-4" />
        Ver el informe
      </a>
    </Button>
  )
  const descargarPdfButton = (
    <Button
      size="lg"
      variant="outline"
      onClick={handleDownloadCertificate}
      className="inline-flex items-center gap-2"
    >
      <ArrowDown className="w-4 h-4" />
      Descargar el PDF
    </Button>
  )

  // ---------------------------------------------------------------------------
  // CTA section per status
  // ---------------------------------------------------------------------------

  let cta: React.ReactNode = null

  if (status === 'firmado' && certId && paid) {
    cta = (
      <div className="flex flex-col sm:flex-row gap-3">
        {verInformeButton}
        {descargarPdfButton}
      </div>
    )
  } else if (status === 'firmado' && certId && !paid) {
    cta = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <SealCheck className="w-4 h-4 flex-none" />
          <span>Estamos confirmando tu pago.</span>
        </div>
        {reportHref !== null && (
          <a
            href={reportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowSquareOut className="w-4 h-4" />
            Ver el avance del informe
          </a>
        )}
      </div>
    )
  } else if (status === 'entregado' && certId) {
    cta = (
      <div className="flex flex-col sm:flex-row gap-3">
        {verInformeButton}
        {descargarPdfButton}
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
        {isError && (
          <span className="text-xs text-fg-muted">
            (último dato conocido — reconectando…)
          </span>
        )}
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
