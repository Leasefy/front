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
  ArrowSquareOut,
  ArrowsClockwise,
  DownloadSimple,
  FileText,
  WarningCircle,
} from '@phosphor-icons/react'
import { CrossFade } from '@leasefy/cadence'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PasosDelEnlace, type PasoDelEnlace } from '@/components/enlace-publico/MarcoDelEnlace'
import { TERMINAL_STATUSES, STATUS_BADGE } from '@/lib/types/avaluo'
import type { AvaluoStatus, AvaluoStatusResponse } from '@/lib/types/avaluo'
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

/**
 * En qué va el avalúo, en tres pasos (glow up 22-10): la persona ve dónde
 * está y qué falta, no sólo una insignia. El pago ya se hizo al solicitar.
 */
function pasosDelAvaluo(status: AvaluoStatus): PasoDelEnlace[] | null {
  if (status === 'rechazado') return null
  const orden: AvaluoStatus[] = ['borrador', 'en_revisión', 'firmado', 'entregado']
  const i = orden.indexOf(status)
  const estado = (paso: number): PasoDelEnlace['estado'] =>
    status === 'entregado' ? 'hecho' : paso < i ? 'hecho' : paso === i ? 'actual' : 'pendiente'
  return [
    { titulo: 'Solicitud', estado: estado(0) },
    { titulo: 'Revisión y firma', estado: estado(1) },
    { titulo: 'Informe listo', estado: status === 'firmado' || status === 'entregado' ? 'hecho' : 'pendiente' },
  ]
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function EstadoSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32 rounded-full" />
      <Skeleton className="h-4 w-56 rounded-sm" />
      <Skeleton className="h-10 w-40 rounded-md" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvaluoEstadoCard({
  submissionId,
  statusData,
  isLoading,
  isError,
}: AvaluoEstadoCardProps) {
  if (isLoading && !statusData) {
    return (
      <Card className="space-y-4 p-6">
        <EstadoSkeleton />
      </Card>
    )
  }

  if (!statusData) {
    if (isError) {
      // Regla de oro de los errores: no culpar a la conexión sin saberlo.
      return (
        <Card className="space-y-2 p-6">
          <div className="flex items-start gap-3">
            <WarningCircle className="mt-0.5 h-5 w-5 flex-none text-danger" weight="fill" aria-hidden="true" />
            <div>
              <p className="text-body-sm font-medium text-fg">No pudimos obtener el estado del avalúo</p>
              <p className="mt-1 text-caption text-fg-muted">La página vuelve a preguntar sola en unos segundos.</p>
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
  const pasos = pasosDelAvaluo(status)

  const capToken = readCapToken(submissionId)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDownloadCertificate = () => {
    if (!certId || !capToken) {
      toast.error('No encontramos tu token de acceso. Intenta desde el mismo navegador donde solicitaste el avalúo.')
      return
    }
    const url = certificateUrl(certId, capToken)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const reportHref = slug && capToken ? reporteAvaluoHref(slug, capToken) : null

  const verInformeButton = reportHref !== null && (
    <Button asChild size="lg" hideArrow className="inline-flex items-center gap-2">
      <a href={reportHref} target="_blank" rel="noopener noreferrer">
        <FileText className="h-4 w-4" aria-hidden="true" />
        Ver el informe
      </a>
    </Button>
  )
  const descargarPdfButton = (
    <Button
      size="lg"
      variant="outline"
      hideArrow
      onClick={handleDownloadCertificate}
      className="inline-flex items-center gap-2"
    >
      <DownloadSimple className="h-4 w-4" aria-hidden="true" />
      Descargar el PDF
    </Button>
  )

  // ── La respuesta y lo que se puede hacer, por estado ──────────────────────

  let respuesta: React.ReactNode = null
  let cta: React.ReactNode = null

  if (status === 'firmado' && certId && paid) {
    respuesta = 'Tu informe está listo.'
    cta = (
      <div className="flex flex-col gap-3 sm:flex-row">
        {verInformeButton}
        {descargarPdfButton}
      </div>
    )
  } else if (status === 'firmado' && certId && !paid) {
    respuesta = 'Estamos confirmando tu pago.'
    cta =
      reportHref !== null ? (
        <a
          href={reportHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-body-sm text-fg underline underline-offset-4 hover:text-fg-muted"
        >
          <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
          Ver el avance del informe
        </a>
      ) : null
  } else if (status === 'entregado' && certId) {
    respuesta = 'Tu informe está listo.'
    cta = (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {verInformeButton}
        {descargarPdfButton}
        {slug && (
          <a
            href={`/avaluo/verificar/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-center text-body-sm text-fg underline underline-offset-4 hover:text-fg-muted"
          >
            <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
            Verificar certificado
          </a>
        )}
      </div>
    )
  } else if (status === 'rechazado') {
    respuesta = 'Avalúo rechazado'
    cta = (
      <p className="text-body-sm leading-relaxed text-fg-muted">
        No fue posible procesar tu solicitud. Si crees que esto es un error, contáctanos a{' '}
        <a href="mailto:avaluos@leasefy.co" className="text-fg underline underline-offset-2">
          avaluos@leasefy.co
        </a>
        .
      </p>
    )
  } else {
    respuesta = 'Estamos procesando tu avalúo'
  }

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={badge.variant as React.ComponentProps<typeof Badge>['variant']}>{badge.label}</Badge>
        {isError && <span className="text-caption text-fg-muted">(último dato conocido — reconectando…)</span>}
      </div>

      {pasos ? <PasosDelEnlace pasos={pasos} etiqueta="En qué va tu avalúo" /> : null}

      <CrossFade swapKey={`${status}-${paid ? 'p' : 'n'}`} className="space-y-4">
        <p
          className={
            status === 'rechazado'
              ? 'flex items-center gap-2 font-heading text-[22px] font-[420] leading-tight tracking-[-0.02em] text-danger'
              : 'font-heading text-[22px] font-[420] leading-tight tracking-[-0.02em] text-fg'
          }
        >
          {status === 'rechazado' ? <WarningCircle className="h-6 w-6 shrink-0" weight="fill" aria-hidden="true" /> : null}
          {respuesta}
        </p>
        {cta ? <div>{cta}</div> : null}
      </CrossFade>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border-faint pt-4 text-caption text-fg-muted">
        {statusData.updatedAt ? (
          <p>
            Última actualización:{' '}
            <span className="font-mono tabular-nums">
              {new Date(statusData.updatedAt).toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </p>
        ) : null}
        {!isTerminal && (
          <p className="flex items-center gap-1.5">
            <ArrowsClockwise className="h-3.5 w-3.5" aria-hidden="true" />
            Se actualiza automáticamente
          </p>
        )}
      </div>
    </Card>
  )
}
