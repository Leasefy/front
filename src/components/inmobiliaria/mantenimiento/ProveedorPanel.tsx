'use client'

/**
 * ProveedorPanel.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Shows the RECOMMENDED provider(s) — principal + optional backup. Language is
 * "sugerido"/"recomendado" only; "asignar" is a CTA, never asserted here
 * (CONTEXT §07-04 action). Presentational only.
 *
 * i18n: canonical C7-03 keys — `…detalle.proveedor` (title) and `…card.sinProveedor`
 * (the empty fallback that EXISTS in the C7-03 tree). A dedicated
 * `proveedor.sinSugerencia` key is NOT in the tree → reuse `card.sinProveedor`
 * (reported as a follow-up). Provider sub-labels (rating/eta) are not in the tree
 * either; rendered with neutral inline glyphs + raw values.
 */

import { Truck, Star, Clock } from '@phosphor-icons/react'
import { Badge, Card, CardContent, CardHeader, CardTitle, Separator } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import type { MaintenanceTicketDetail, RecommendedProvider } from '@/lib/types/mantenimiento'

interface ProveedorPanelProps {
  proveedorRecomendado: MaintenanceTicketDetail['proveedorRecomendado']
}

const ROOT = 'inmobiliaria.ai.mantenimiento'

function ProviderRow({ provider, isBackup }: { provider: RecommendedProvider; isBackup?: boolean }) {
  return (
    <div data-testid={isBackup ? 'proveedor-backup' : 'proveedor-principal'} className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-fg">
          {provider.nombre}
        </span>
        {isBackup && <Badge variant="outline">backup</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
        {provider.rating !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Star size={13} weight="fill" className="text-warning" aria-hidden="true" />
            {provider.rating.toFixed(1)}
          </span>
        )}
        {provider.etaHoras !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Clock size={13} weight="duotone" aria-hidden="true" />
            {provider.etaHoras}h
          </span>
        )}
      </div>
      {provider.motivo && (
        <p className="text-xs text-fg-muted leading-relaxed">
          {provider.motivo}
        </p>
      )}
    </div>
  )
}

export function ProveedorPanel({ proveedorRecomendado }: ProveedorPanelProps) {
  const { t } = useI18n()
  const { principal, backup } = proveedorRecomendado
  const hasAny = principal !== null || backup !== null

  return (
    <Card data-testid="proveedor-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck size={18} className="text-success" weight="duotone" aria-hidden="true" />
          {t(`${ROOT}.detalle.proveedor`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {!hasAny ? (
          <p data-testid="proveedor-empty" className="text-sm text-fg-muted">
            {t(`${ROOT}.card.sinProveedor`)}
          </p>
        ) : (
          <>
            {principal && <ProviderRow provider={principal} />}
            {principal && backup && <Separator />}
            {backup && <ProviderRow provider={backup} isBackup />}
          </>
        )}
      </CardContent>
    </Card>
  )
}
