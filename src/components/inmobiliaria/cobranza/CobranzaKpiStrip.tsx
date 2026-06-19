'use client'

import { Users, CurrencyDollar, Phone, Warning } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'

interface CobranzaKpiStripProps {
  deudoresActivos: number
  pagadoHoyCop: number
  llamadasHoy: number
  escalacionesPendientes: number
  isLoading?: boolean
}

function formatCOP(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

export function CobranzaKpiStrip({
  deudoresActivos,
  pagadoHoyCop,
  llamadasHoy,
  escalacionesPendientes,
  isLoading = false,
}: CobranzaKpiStripProps) {
  const { t } = useI18n()

  const cards = [
    {
      label: t('inmobiliaria.ai.cobranza.overview.kpis.deudoresActivos'),
      value: String(deudoresActivos),
      Icon: Users,
      iconColor: 'text-neutral-600 dark:text-neutral-300',
    },
    {
      label: t('inmobiliaria.ai.cobranza.overview.kpis.pagadoHoy'),
      value: formatCOP(pagadoHoyCop),
      Icon: CurrencyDollar,
      iconColor: 'text-success',
    },
    {
      label: t('inmobiliaria.ai.cobranza.overview.kpis.llamadasHoy'),
      value: String(llamadasHoy),
      Icon: Phone,
      iconColor: 'text-primary',
    },
    {
      label: t('inmobiliaria.ai.cobranza.overview.kpis.escalacionesPendientes'),
      value: String(escalacionesPendientes),
      Icon: Warning,
      iconColor: 'text-warning',
    },
  ]

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      data-testid="kpi-strip"
    >
      {cards.map(({ label, value, Icon, iconColor }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon size={18} className={iconColor} weight="duotone" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">
              {label}
            </p>
          </div>
          {isLoading ? (
            <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          ) : (
            <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">
              {value}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
