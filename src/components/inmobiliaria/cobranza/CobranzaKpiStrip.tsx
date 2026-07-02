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
      iconColor: 'text-fg-muted',
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
          className="rounded-[20px] border border-border bg-surface p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon size={18} className={iconColor} weight="duotone" />
            <p className="text-xs text-fg-subtle leading-tight">
              {label}
            </p>
          </div>
          {isLoading ? (
            <div className="h-6 w-16 rounded bg-surface-muted animate-pulse" />
          ) : (
            <p className="text-xl font-semibold text-fg mt-1 font-mono tabular-nums">
              {value}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
