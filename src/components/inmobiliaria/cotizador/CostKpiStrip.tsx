'use client'

/**
 * CostKpiStrip.tsx — Phase 35 plan 35-10
 *
 * 3-KPI strip for the cost dashboard:
 *   1. Cost per quote (indigo-500)
 *   2. Monthly burn (teal-500)
 *   3. 30-day forecast (neutral-400) — null → "—" (T-35-14 mitigation)
 *
 * Forecast caption + tooltip rendered below forecast card at all times (even when null).
 */

import { CurrencyDollar, Wallet, TrendUp, Info } from '@phosphor-icons/react'
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
      iconColor: 'text-indigo-500',
      caption: null,
    },
    {
      key: 'monthlyBurn',
      label: t('inmobiliaria.ai.cotizador.costos.kpiMonthlyBurn'),
      value: formatUsd2(kpis?.monthlyBurnUsd),
      Icon: Wallet,
      iconColor: 'text-teal-500',
      caption: null,
    },
    {
      key: 'forecast30d',
      label: t('inmobiliaria.ai.cotizador.costos.kpiForecast30d'),
      // Explicit null check: != null catches both null and undefined (T-35-14)
      value: kpis?.forecast30dUsd != null ? `$${kpis.forecast30dUsd.toFixed(2)}` : '—',
      Icon: TrendUp,
      iconColor: 'text-neutral-400',
      caption: t('inmobiliaria.ai.cotizador.costos.forecastCaption'),
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map(({ key, label, value, Icon, iconColor, caption }) => (
        <div
          key={key}
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon weight="duotone" className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{label}</p>
          </div>
          {isLoading ? (
            <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">{value}</p>
          )}
          {caption && (
            <div className="flex items-center gap-1 mt-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                {caption}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                      <Info className="h-3 w-3" />
                    </button>
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
