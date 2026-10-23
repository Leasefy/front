'use client'

import { useI18n } from '@/lib/i18n'
import { Cifra, CrossFade, FranjaDeCifras, type TonoDeCifra } from '@leasefy/cadence'
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
  /** Punto de estado: sólo cuando la cifra pide atención (una emergencia activa, algo vencido). */
  tono?: TonoDeCifra
}

/** Una celda de la franja. Cargando, un hueco; después, la cifra con un fundido. */
function Celda({ card, isLoading }: { card: KpiCardModel; isLoading: boolean }) {
  return (
    <Cifra
      etiqueta={card.label}
      tono={isLoading ? undefined : card.tono}
      valor={
        <CrossFade swapKey={isLoading ? 'cargando' : card.value}>
          {isLoading ? (
            <span className="mt-1 block h-6 w-16 rounded bg-surface-muted animate-pulse" />
          ) : (
            <span data-kpi-valor>{card.value}</span>
          )}
        </CrossFade>
      }
    />
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
    },
    {
      key: 'emergenciasActivas',
      label: k('emergenciasActivas'),
      value: kpis ? String(kpis.emergenciasActivas) : SIN_DATO,
      tono: kpis && kpis.emergenciasActivas > 0 ? 'peligro' : undefined,
    },
    {
      key: 'vencidos',
      label: k('vencidos'),
      value: kpis ? String(kpis.vencidos) : SIN_DATO,
      tono: kpis && kpis.vencidos > 0 ? 'aviso' : undefined,
    },
    {
      key: 'tiempoPrimeraRespuesta',
      label: k('tiempoPrimeraRespuesta'),
      value: kpis ? `${kpis.tiempoPrimeraRespuestaMin} ${unitMin}` : SIN_DATO,
    },
    {
      key: 'slaCumplido',
      label: k('slaCumplido'),
      value: kpis ? `${kpis.slaCumplidoPct}%` : SIN_DATO,
    },
    {
      key: 'costoEstimado',
      label: k('costoEstimado'),
      value: kpis ? formatCOP(kpis.costoEstimadoAbiertoCop) : SIN_DATO,
    },
    {
      key: 'propietariosEnRiesgo',
      label: k('propietariosEnRiesgo'),
      value: kpis ? String(kpis.propietariosEnRiesgo) : SIN_DATO,
      tono: kpis && kpis.propietariosEnRiesgo > 0 ? 'aviso' : undefined,
    },
  ]

  // Anti-gaming KPIs — MANDATORY, surfaced in a visually separated block.
  const antiGamingCards: KpiCardModel[] = [
    {
      key: 'reaperturas30d',
      label: k('reaperturas30d'),
      value: kpis ? `${kpis.reaperturas30dPct}%` : SIN_DATO,
    },
    {
      key: 'tiempoResolucionReal',
      label: k('tiempoResolucionReal'),
      value: kpis ? `${kpis.tiempoResolucionRealDias} ${unitDias}` : SIN_DATO,
    },
  ]

  return (
    <div className="space-y-6" data-testid="kpi-strip">
      {/* La salud de la operación: una franja (de a cuatro por fila) */}
      <FranjaDeCifras columnas={4}>
        {healthCards.map((card) => (
          <Celda key={card.key} card={card} isLoading={isLoading} />
        ))}
      </FranjaDeCifras>

      {/* Anti-gaming KPIs — separated block (CONTEXT §compliance, non-negotiable) */}
      <div data-testid="anti-gaming" className="space-y-2.5">
        <h2 className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-fg-subtle">
          {t('inmobiliaria.ai.mantenimiento.overview.antiGamingLabel')}
        </h2>
        <FranjaDeCifras columnas={2} className="md:max-w-[50%]">
          {antiGamingCards.map((card) => (
            <Celda key={card.key} card={card} isLoading={isLoading} />
          ))}
        </FranjaDeCifras>
      </div>
    </div>
  )
}
