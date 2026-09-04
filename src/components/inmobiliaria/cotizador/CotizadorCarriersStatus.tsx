'use client'

import { Warning } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/lib/cartera'
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview'

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

const ROUTE_COLORS: Record<string, string> = {
  rest: 'bg-surface-muted text-fg-muted',
  stub: 'bg-warning-soft text-warning',
  disabled: 'bg-surface-muted text-fg-subtle',
}

function RouteBadge({ mode, t }: { mode: string; t: (k: string) => string }) {
  const modeKeyMap: Record<string, string> = {
    rest: 'inmobiliaria.ai.cotizador.overview.carriers.routeModeRest',
    stub: 'inmobiliaria.ai.cotizador.overview.carriers.routeModeStub',
    disabled: 'inmobiliaria.ai.cotizador.overview.carriers.routeModeDisabled',
  }
  const key = modeKeyMap[mode] ?? modeKeyMap.stub
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROUTE_COLORS[mode] ?? ROUTE_COLORS.rest}`}
    >
      {t(key)}
    </span>
  )
}

const SLA_COLORS: Record<string, string> = {
  healthy: 'text-success',
  degraded: 'text-warning',
  breached: 'text-danger',
}

function SlaBadge({ state, t }: { state: string; t: (k: string) => string }) {
  const slaKeyMap: Record<string, string> = {
    healthy: 'inmobiliaria.ai.cotizador.overview.carriers.slaOk',
    degraded: 'inmobiliaria.ai.cotizador.overview.carriers.slaWarning',
    breached: 'inmobiliaria.ai.cotizador.overview.carriers.slaBreach',
  }
  const key = slaKeyMap[state] ?? slaKeyMap.healthy
  return (
    <span className={`text-xs font-medium ${SLA_COLORS[state] ?? SLA_COLORS.healthy}`}>
      SLA: {t(key)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CotizadorCarriersStatusProps {
  carriers: CotizadorOverviewResponse['carriers']
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CotizadorCarriersStatus({
  carriers,
  isLoading = false,
}: CotizadorCarriersStatusProps) {
  const { t, locale } = useI18n()

  const enabledCarriers = carriers.filter((c) => c.enabled)
  const allInBreach =
    enabledCarriers.length > 0 && enabledCarriers.every((c) => c.slaState === 'breached')

  if (isLoading && carriers.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="h-4 w-24 rounded bg-surface-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-surface-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-surface-muted animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* All-breach banner */}
      {allInBreach && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger flex items-center gap-2">
          <Warning weight="fill" className="h-4 w-4 flex-shrink-0" />
          {t('inmobiliaria.ai.cotizador.overview.carriers.allBreachBanner')}
        </div>
      )}

      {/* Carriers grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {enabledCarriers.map((carrier) => (
          <div
            key={carrier.name}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            {/* Carrier name + route mode badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg capitalize">
                {carrier.name}
              </span>
              <RouteBadge mode={carrier.mode} t={t} />
            </div>
            {/* SLA state badge */}
            <SlaBadge state={carrier.slaState} t={t} />
            {/* Last verdict time */}
            <p className="text-xs text-fg-muted">
              {t('inmobiliaria.ai.cotizador.overview.carriers.lastVerdict')}:{' '}
              {carrier.lastVerdictAt
                ? relativeTime(carrier.lastVerdictAt, locale)
                : t('inmobiliaria.ai.cotizador.overview.carriers.neverSeen')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
