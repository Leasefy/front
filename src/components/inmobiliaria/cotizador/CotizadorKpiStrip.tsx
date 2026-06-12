'use client'

import { FileText, CheckCircle, ShieldStar, CurrencyDollar } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCOP(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CotizadorKpiStripProps {
  kpis: CotizadorOverviewResponse['kpis'] | null
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CotizadorKpiStrip({ kpis, isLoading = false }: CotizadorKpiStripProps) {
  const { t } = useI18n()

  const cards = [
    {
      label: t('inmobiliaria.ai.cotizador.overview.kpis.quotesToday'),
      value: kpis ? String(kpis.quotesHoy) : '—',
      Icon: FileText,
      iconColor: 'text-teal-500',
    },
    {
      label: t('inmobiliaria.ai.cotizador.overview.kpis.approvalRate'),
      value: kpis ? `${(kpis.approvalRate * 100).toFixed(0)}%` : '—',
      Icon: CheckCircle,
      iconColor: 'text-green-500',
    },
    {
      label: t('inmobiliaria.ai.cotizador.overview.kpis.primaPromedio'),
      value: kpis ? `$${formatCOP(kpis.primaPromedioMonthlyCop)}` : '—',
      Icon: ShieldStar,
      iconColor: 'text-teal-600',
    },
    {
      label: t('inmobiliaria.ai.cotizador.overview.kpis.costPerQuote'),
      value: kpis ? `$${formatCOP(kpis.costPerQuoteCop)}` : '—',
      Icon: CurrencyDollar,
      iconColor: 'text-indigo-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, Icon, iconColor }) => (
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
            <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">{value}</p>
          )}
        </div>
      ))}
    </div>
  )
}
