'use client'

/**
 * CarrierDeepDiveKpiStrip.tsx — Phase 35 plan 35-08 (Task 2)
 *
 * 4-KPI strip for the per-carrier deep-dive page.
 * Grid: 2×2 on sm, 4×1 on md+ (D-35-09 / XR-03).
 * Latency and cost values use font-mono tabular-nums (UI-SPEC §Typography).
 */

import { Timer, Warning, CheckCircle, CurrencyDollar } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import type { CarrierDetailPayload } from '@/lib/hooks/cotizador/use-carrier-detail'

// =============================================================================
// Props
// =============================================================================

interface CarrierDeepDiveKpiStripProps {
  kpis: CarrierDetailPayload['kpis'] | null
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function CarrierDeepDiveKpiStrip({ kpis, isLoading = false }: CarrierDeepDiveKpiStripProps) {
  const { t } = useI18n()

  const cards = [
    {
      label: t('inmobiliaria.ai.cotizador.aseguradoras.carrier.kpis.latencyP95'),
      value: kpis ? `${kpis.latencyP95Ms}ms` : '—',
      Icon: Timer,
      iconColor: 'text-neutral-600 dark:text-neutral-300',
      valueMono: true,
    },
    {
      label: t('inmobiliaria.ai.cotizador.aseguradoras.carrier.kpis.errorRate'),
      value: kpis ? `${(kpis.errorRate24h * 100).toFixed(1)}%` : '—',
      Icon: Warning,
      iconColor: 'text-[#C4503B]',
      valueMono: false,
    },
    {
      label: t('inmobiliaria.ai.cotizador.aseguradoras.carrier.kpis.approvalRate'),
      value: kpis ? `${(kpis.approvalRate30d * 100).toFixed(0)}%` : '—',
      Icon: CheckCircle,
      iconColor: 'text-[#2C7A53]',
      valueMono: false,
    },
    {
      label: t('inmobiliaria.ai.cotizador.aseguradoras.carrier.kpis.costPerQuote'),
      value: kpis ? `$${kpis.costPerQuoteUsd30d.toFixed(3)}` : '—',
      Icon: CurrencyDollar,
      iconColor: 'text-[#1A40FF]',
      valueMono: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, Icon, iconColor, valueMono }) => (
        <div
          key={label}
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon weight="duotone" className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{label}</p>
          </div>
          {isLoading ? (
            <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mt-1" />
          ) : (
            <p
              className={[
                'text-xl font-semibold text-neutral-900 dark:text-white mt-1',
                valueMono ? 'font-mono tabular-nums' : '',
              ].join(' ').trim()}
            >
              {value}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
