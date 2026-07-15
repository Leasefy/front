'use client'

/**
 * CostKpiStrip.tsx — Phase 35 plan 35-10
 *
 * 3-KPI strip for the cost dashboard:
 *   1. Cost per quote ([#1A40FF])
 *   2. Monthly burn ([#6B6B6B])
 *   3. 30-day forecast (neutral-400) — null → "—" (T-35-14 mitigation)
 *
 * Forecast caption + tooltip rendered below forecast card at all times (even when null).
 */

import { CurrencyDollar, Wallet, TrendUp, Info } from '@phosphor-icons/react'
import { IconButton } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// =============================================================================
// Props
// =============================================================================

interface CostKpiStripProps {
  kpis: {
    costPerQuoteUsd: number | null
    monthlyBurnUsd: number | null
    forecast30dUsd: number | null
  } | null
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function CostKpiStrip({ kpis, isLoading = false }: CostKpiStripProps) {
  const { t } = useI18n()

  // Null-guard rule (T-35-14): use != null to catch both null and undefined.
  // NEVER render "0" or "$0.00" for a null forecast value.
  const formatUsd4 = (v: number | null | undefined): string =>
    v != null ? `$${v.toFixed(4)}` : '—'

  const formatUsd2 = (v: number | null | undefined): string =>
    v != null ? `$${v.toFixed(2)}` : '—'

  const cards = [
    {
      key: 'costPerQuote',
      label: t('inmobiliaria.ai.cotizador.costos.kpiCostPerQuote'),
      value: formatUsd4(kpis?.costPerQuoteUsd),
      Icon: CurrencyDollar,
      iconColor: 'text-primary',
      caption: null,
    },
    {
      key: 'monthlyBurn',
      label: t('inmobiliaria.ai.cotizador.costos.kpiMonthlyBurn'),
      value: formatUsd2(kpis?.monthlyBurnUsd),
      Icon: Wallet,
      iconColor: 'text-fg-muted',
      caption: null,
    },
    {
      key: 'forecast30d',
      label: t('inmobiliaria.ai.cotizador.costos.kpiForecast30d'),
      // Explicit null check: != null catches both null and undefined (T-35-14)
      value: kpis?.forecast30dUsd != null ? `$${kpis.forecast30dUsd.toFixed(2)}` : '—',
      Icon: TrendUp,
      iconColor: 'text-fg-muted',
      caption: t('inmobiliaria.ai.cotizador.costos.forecastCaption'),
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map(({ key, label, value, Icon, iconColor, caption }) => (
        <div
          key={key}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon weight="duotone" className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
            <p className="text-xs text-fg-muted truncate">{label}</p>
          </div>
          {isLoading ? (
            <div className="h-6 w-16 rounded bg-surface-muted animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-semibold text-fg mt-1">{value}</p>
          )}
          {caption && (
            <div className="flex items-center gap-1 mt-2">
              <p className="text-xs text-fg-muted leading-snug">
                {caption}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Info className="h-3 w-3" />}
                      aria-label={t('inmobiliaria.ai.cotizador.costos.forecastTooltip')}
                      className="flex-shrink-0"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {t('inmobiliaria.ai.cotizador.costos.forecastTooltip')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
