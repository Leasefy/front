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

/**
 * Lo que no se pudo traer va con raya, no con cero.
 *
 * Con `kpis === null` (la consulta falló o el endpoint del agente todavía no
 * existe) esta franja imprimía «0 tickets abiertos», «0 emergencias activas»
 * y «0 % de SLA cumplido» — y el cartel de error quedaba DEBAJO, así que la
 * pantalla tranquilizaba y avisaba del fallo al mismo tiempo. Un cero es una
 * afirmación sobre la operación; «no lo pudimos traer» no lo es. Mismo criterio
 * que los StatCard de `/panel/inmobiliaria/mantenimientos` (que ya usan «—»).
 */
const SIN_DATO = '—'

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
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className={iconColor} weight="duotone" />
        <p className="text-xs text-fg-muted leading-tight">{label}</p>
      </div>
      {isLoading ? (
        <div className="h-6 w-16 rounded bg-surface-muted animate-pulse" />
      ) : (
        <p className="text-xl font-semibold text-fg mt-1">{value}</p>
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
      value: kpis ? String(kpis.ticketsAbiertos) : SIN_DATO,
      Icon: Wrench,
      iconColor: 'text-primary',
    },
    {
      key: 'emergenciasActivas',
      label: k('emergenciasActivas'),
      value: kpis ? String(kpis.emergenciasActivas) : SIN_DATO,
      Icon: Siren,
      iconColor: 'text-danger',
    },
    {
      key: 'vencidos',
      label: k('vencidos'),
      value: kpis ? String(kpis.vencidos) : SIN_DATO,
      Icon: WarningCircle,
      iconColor: 'text-warning',
    },
    {
      key: 'tiempoPrimeraRespuesta',
      label: k('tiempoPrimeraRespuesta'),
      value: kpis ? `${kpis.tiempoPrimeraRespuestaMin} ${unitMin}` : SIN_DATO,
      Icon: Clock,
      iconColor: 'text-info',
    },
    {
      key: 'slaCumplido',
      label: k('slaCumplido'),
      value: kpis ? `${kpis.slaCumplidoPct}%` : SIN_DATO,
      Icon: CheckCircle,
      iconColor: 'text-success',
    },
    {
      key: 'costoEstimado',
      label: k('costoEstimado'),
      value: kpis ? formatCOP(kpis.costoEstimadoAbiertoCop) : SIN_DATO,
      Icon: CurrencyDollar,
      iconColor: 'text-success',
    },
    {
      key: 'propietariosEnRiesgo',
      label: k('propietariosEnRiesgo'),
      value: kpis ? String(kpis.propietariosEnRiesgo) : SIN_DATO,
      Icon: UserCircle,
      iconColor: 'text-warning',
    },
  ]

  // Anti-gaming KPIs — MANDATORY, surfaced in a visually separated block.
  const antiGamingCards: KpiCardModel[] = [
    {
      key: 'reaperturas30d',
      label: k('reaperturas30d'),
      value: kpis ? `${kpis.reaperturas30dPct}%` : SIN_DATO,
      Icon: ArrowsClockwise,
      iconColor: 'text-danger',
    },
    {
      key: 'tiempoResolucionReal',
      label: k('tiempoResolucionReal'),
      value: kpis ? `${kpis.tiempoResolucionRealDias} ${unitDias}` : SIN_DATO,
      Icon: Hourglass,
      iconColor: 'text-info',
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
        <h2 className="text-sm font-medium text-fg-muted mb-3">
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
