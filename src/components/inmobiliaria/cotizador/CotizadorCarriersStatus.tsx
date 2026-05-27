'use client'

import { Warning } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/lib/cartera'
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview'

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

const ROUTE_COLORS: Record<string, string> = {
  rest: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400',
  stub: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  disabled: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400',
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
  healthy: 'text-emerald-600 dark:text-emerald-400',
  degraded: 'text-amber-600 dark:text-amber-400',
  breached: 'text-red-600 dark:text-red-400',
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
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 space-y-3"
          >
            <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* All-breach banner */}
      {allInBreach && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <Warning weight="fill" className="h-4 w-4 flex-shrink-0" />
          {t('inmobiliaria.ai.cotizador.overview.carriers.allBreachBanner')}
        </div>
      )}

      {/* Carriers grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {enabledCarriers.map((carrier) => (
          <div
            key={carrier.name}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 space-y-3"
          >
            {/* Carrier name + route mode badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-900 dark:text-white capitalize">
                {carrier.name}
              </span>
              <RouteBadge mode={carrier.mode} t={t} />
            </div>
            {/* SLA state badge */}
            <SlaBadge state={carrier.slaState} t={t} />
            {/* Last verdict time */}
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
