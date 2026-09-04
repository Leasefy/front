'use client'

import {
  Wrench,
  Siren,
  WarningCircle,
  Clock,
  CheckCircle,
  CurrencyDollar,
  UserCircle,
  ArrowsClockwise,
  Hourglass,
  type Icon,
} from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import type { MaintenanceKpis } from '@/lib/types/mantenimiento'

interface MantenimientoKpiStripProps {
  kpis: MaintenanceKpis | null
  isLoading?: boolean
}

/** Compact integer-COP formatter (parity with CobranzaKpiStrip.formatCOP). */
function formatCOP(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

interface KpiCardModel {
  key: string
  label: string
  value: string
  Icon: Icon
  iconColor: string
}

function KpiCard({
  card,
  isLoading,
}: {
  card: KpiCardModel
  isLoading: boolean
}) {
  const { label, value, Icon, iconColor } = card
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className={iconColor} weight="duotone" />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">{label}</p>
      </div>
      {isLoading ? (
        <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      ) : (
        <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">{value}</p>
      )}
    </div>
  )
}

export function MantenimientoKpiStrip({
  kpis,
  isLoading = false,
}: MantenimientoKpiStripProps) {
  const { t } = useI18n()

  const k = (key: string) => t(`inmobiliaria.ai.mantenimiento.overview.kpis.${key}`)
  const unitMin = t('inmobiliaria.ai.mantenimiento.overview.kpis.unitMin')
  const unitDias = t('inmobiliaria.ai.mantenimiento.overview.kpis.unitDias')

  // Health KPIs — the 7 non-anti-gaming numeric fields of MaintenanceKpis.
  const healthCards: KpiCardModel[] = [
    {
      key: 'ticketsAbiertos',
      label: k('ticketsAbiertos'),
      value: String(kpis?.ticketsAbiertos ?? 0),
      Icon: Wrench,
      iconColor: 'text-orange-500',
    },
    {
      key: 'emergenciasActivas',
      label: k('emergenciasActivas'),
      value: String(kpis?.emergenciasActivas ?? 0),
      Icon: Siren,
      iconColor: 'text-red-500',
    },
    {
      key: 'vencidos',
      label: k('vencidos'),
      value: String(kpis?.vencidos ?? 0),
      Icon: WarningCircle,
      iconColor: 'text-amber-500',
    },
    {
      key: 'tiempoPrimeraRespuesta',
      label: k('tiempoPrimeraRespuesta'),
      value: `${kpis?.tiempoPrimeraRespuestaMin ?? 0} ${unitMin}`,
      Icon: Clock,
      iconColor: 'text-indigo-500',
    },
    {
      key: 'slaCumplido',
      label: k('slaCumplido'),
      value: `${kpis?.slaCumplidoPct ?? 0}%`,
      Icon: CheckCircle,
      iconColor: 'text-emerald-500',
    },
    {
      key: 'costoEstimado',
      label: k('costoEstimado'),
      value: formatCOP(kpis?.costoEstimadoAbiertoCop ?? 0),
      Icon: CurrencyDollar,
      iconColor: 'text-green-500',
    },
    {
      key: 'propietariosEnRiesgo',
      label: k('propietariosEnRiesgo'),
      value: String(kpis?.propietariosEnRiesgo ?? 0),
      Icon: UserCircle,
      iconColor: 'text-violet-500',
    },
  ]

  // Anti-gaming KPIs — MANDATORY, surfaced in a visually separated block.
  const antiGamingCards: KpiCardModel[] = [
    {
      key: 'reaperturas30d',
      label: k('reaperturas30d'),
      value: `${kpis?.reaperturas30dPct ?? 0}%`,
      Icon: ArrowsClockwise,
      iconColor: 'text-rose-500',
    },
    {
      key: 'tiempoResolucionReal',
      label: k('tiempoResolucionReal'),
      value: `${kpis?.tiempoResolucionRealDias ?? 0} ${unitDias}`,
      Icon: Hourglass,
      iconColor: 'text-fuchsia-500',
    },
  ]

  return (
    <div className="space-y-6" data-testid="kpi-strip">
      {/* Operational-health KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {healthCards.map((card) => (
          <KpiCard key={card.key} card={card} isLoading={isLoading} />
        ))}
      </div>

      {/* Anti-gaming KPIs — separated block (CONTEXT §compliance, non-negotiable) */}
      <div data-testid="anti-gaming">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">
          {t('inmobiliaria.ai.mantenimiento.overview.antiGamingLabel')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {antiGamingCards.map((card) => (
            <KpiCard key={card.key} card={card} isLoading={isLoading} />
          ))}
        </div>
      </div>
    </div>
  )
}
