'use client'

/**
 * TicketDetail.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Composes the 5 detail panels (Qué entendí / Clasificación / Imágenes /
 * Proveedor / Aprobación) plus the TicketCTAs action card. Presentational: it
 * receives the full `MaintenanceTicketDetail` and the CTA callbacks; the hook
 * wiring (mock-first) happens in the `[ticketId]/page.tsx` route.
 *
 * Each panel receives ONLY its slice of the detail. The probable-responsible is a
 * card field on the detail (07-01 type) — passed to ClasificacionPanel as a
 * hypothesis (CONTEXT §compliance).
 *
 * i18n: canonical C7-03 keys — `…enums.estado.*` (legible state) + `…enums.severidad.*`.
 */

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import type { MaintenanceTicketDetail, Severity } from '@/lib/types/mantenimiento'
import { QueEntendiPanel } from './QueEntendiPanel'
import { ClasificacionPanel } from './ClasificacionPanel'
import { ImagenesPanel } from './ImagenesPanel'
import { ProveedorPanel } from './ProveedorPanel'
import { AprobacionPanel } from './AprobacionPanel'
import { TicketCTAs } from './TicketCTAs'

const ROOT = 'inmobiliaria.ai.mantenimiento'

export interface TicketDetailProps {
  detail: MaintenanceTicketDetail
  isBusy?: boolean
  onAsignar: () => void
  onPedirInfo: () => void
  onSolicitarAprobacion: () => void
  onEscalar: () => void
  onCerrar: () => void
  /** Se lo pasa tal cual a `TicketCTAs`: por qué las 5 acciones están apagadas. */
  motivoDeshabilitado?: string
}

function severityVariant(sev: Severity): 'destructive' | 'warning' | 'secondary' {
  if (sev === 'emergencia' || sev === 'alta') return 'destructive'
  if (sev === 'media') return 'warning'
  return 'secondary'
}

export function TicketDetail({
  detail,
  isBusy = false,
  onAsignar,
  onPedirInfo,
  onSolicitarAprobacion,
  onEscalar,
  onCerrar,
  motivoDeshabilitado,
}: TicketDetailProps) {
  const { t } = useI18n()
  const { inmueble } = detail
  const subtitle = inmueble.unit ? `${inmueble.address} · ${inmueble.unit}` : inmueble.address

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {detail.titulo}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={severityVariant(detail.severidad)}>
            {t(`${ROOT}.enums.severidad.${detail.severidad}`)}
          </Badge>
          <Badge variant="outline" data-testid="ticket-estado">
            {t(`${ROOT}.enums.estado.${detail.estado}`)}
          </Badge>
        </div>
      </header>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3): qué entendí + clasificación + imágenes */}
        <div className="lg:col-span-2 space-y-6">
          <QueEntendiPanel queEntendi={detail.queEntendi} descripcion={detail.descripcion} />
          <ClasificacionPanel
            clasificacion={detail.clasificacion}
            responsableProbable={detail.responsableProbable}
          />
          <ImagenesPanel vision={detail.vision} />
        </div>

        {/* Right column (1/3): proveedor + aprobación + acciones */}
        <div className="space-y-6">
          <ProveedorPanel proveedorRecomendado={detail.proveedorRecomendado} />
          <AprobacionPanel aprobacion={detail.aprobacion} />
          <Card data-testid="acciones-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t(`${ROOT}.detalle.title`)}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <TicketCTAs
                estado={detail.estado}
                isBusy={isBusy}
                onAsignar={onAsignar}
                onPedirInfo={onPedirInfo}
                onSolicitarAprobacion={onSolicitarAprobacion}
                onEscalar={onEscalar}
                onCerrar={onCerrar}
                motivoDeshabilitado={motivoDeshabilitado}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
