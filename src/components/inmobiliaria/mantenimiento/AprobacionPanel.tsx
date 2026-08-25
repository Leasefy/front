'use client'

/**
 * AprobacionPanel.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Shows the owner-approval cap, the estimated max cost, and whether owner approval
 * is required. Approval is the OWNER's decision — this panel only reflects state,
 * it does not grant anything (the grant flow is the solicitarAprobacion CTA).
 * Presentational only.
 *
 * i18n: canonical C7-03 keys — `…detalle.aprobacion` (title). A flag label
 * `aprobacion.requiere`/`aprobacion.dentroDeCap` is NOT in the C7-03 tree → reuse
 * `…inbox.card.requiereAprobacion` (which EXISTS) for the "requires" case and an
 * inline success badge for the "within cap" case (reported as a follow-up).
 * COP is formatted locally (full value, es-CO grouping) — same spirit as
 * CobranzaKpiStrip's local formatter.
 */

import { SealCheck, CheckCircle } from '@phosphor-icons/react'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import type { MaintenanceTicketDetail } from '@/lib/types/mantenimiento'

interface AprobacionPanelProps {
  aprobacion: MaintenanceTicketDetail['aprobacion']
}

const ROOT = 'inmobiliaria.ai.mantenimiento'

/** Full COP with es-CO grouping (no decimals). */
function formatCOP(value: number): string {
  return `$${value.toLocaleString('es-CO')}`
}

export function AprobacionPanel({ aprobacion }: AprobacionPanelProps) {
  const { t } = useI18n()
  const { capCop, estimatedMaxCop, requiresApproval } = aprobacion

  return (
    <Card data-testid="aprobacion-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SealCheck size={18} className="text-amber-500" weight="duotone" aria-hidden="true" />
          {t(`${ROOT}.detalle.aprobacion`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-neutral-500 dark:text-neutral-400">{t(`${ROOT}.inbox.card.estCost`)}</dt>
            <dd className="font-mono font-semibold text-neutral-900 dark:text-white">
              {formatCOP(estimatedMaxCop)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-neutral-500 dark:text-neutral-400">{t(`${ROOT}.filters.aprobacion`)}</dt>
            <dd className="font-mono text-neutral-600 dark:text-neutral-300">{formatCOP(capCop)}</dd>
          </div>
        </dl>

        {requiresApproval ? (
          <Badge variant="warning" className="gap-1" data-testid="aprobacion-requiere">
            <SealCheck size={14} weight="duotone" aria-hidden="true" />
            {t(`${ROOT}.inbox.card.requiereAprobacion`)}
          </Badge>
        ) : (
          <Badge variant="success" className="gap-1" data-testid="aprobacion-dentro-cap">
            <CheckCircle size={14} weight="duotone" aria-hidden="true" />
            {t(`${ROOT}.detalle.aprobacion`)}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
