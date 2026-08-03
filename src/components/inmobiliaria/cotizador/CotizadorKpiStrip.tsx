'use client'

import {
  FileText,
  CheckCircle,
  ShieldStar,
  CurrencyDollar,
  ShieldCheck,
  Stack,
  ShieldSlash,
  Timer,
  House,
  Vault,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { KpiCard } from '@leasefy/cadence'
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

/** t() with raw-key fallback so a missing key never renders the path. */
function useTf() {
  const { t } = useI18n()
  return (key: string, fallback: string) => {
    const r = t(key)
    return r === key ? fallback : r
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CotizadorKpiStripProps {
  kpis: CotizadorOverviewResponse['kpis'] | null
  isLoading?: boolean
}

/**
 * Extended KPI fields (visión #4 — home con hasta 8 métricas). The backend
 * currently returns the 4 base KPIs; these optional fields render ONLY when the
 * backend starts emitting them (tolerant-degrade). We never hardcode 8 — the
 * extended cards are conditional, so the grid shows 4 today and grows to 8 the
 * moment the contract is extended, with no further front change. See notes.
 */
type ExtendedKpis = CotizadorOverviewResponse['kpis'] & {
  asegurablesCount?: number
  tasaAsegurabilidad?: number // 0.0–1.0
  multiOpcionCount?: number
  sinAseguradoraCount?: number
  tiempoRespuestaSeconds?: number
  arriendosCerrados?: number
  valorAseguradoCop?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CotizadorKpiStrip({ kpis, isLoading = false }: CotizadorKpiStripProps) {
  const tf = useTf()
  const k = kpis as ExtendedKpis | null

  type Card = { label: string; value: string; Icon: Icon }

  // Base KPIs (always rendered — current backend contract).
  const cards: Card[] = [
    {
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.quotesToday', 'Consultas hoy'),
      value: kpis ? String(kpis.quotesHoy) : '—',
      Icon: FileText,
    },
    {
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.approvalRate', 'Tasa de aprobación'),
      value: kpis ? `${(kpis.approvalRate * 100).toFixed(0)}%` : '—',
      Icon: CheckCircle,
    },
    {
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.primaPromedio', 'Prima promedio/mes'),
      value: kpis ? `$${formatCOP(kpis.primaPromedioMonthlyCop)}` : '—',
      Icon: ShieldStar,
    },
    {
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.costPerQuote', 'Costo por consulta'),
      value: kpis ? `$${formatCOP(kpis.costPerQuoteCop)}` : '—',
      Icon: CurrencyDollar,
    },
  ]

  // Extended KPIs — appended only when present on the payload. The grid wraps
  // to a second row of up to 4 once these arrive (visión #4: home 8 metrics).
  if (k && typeof k.asegurablesCount === 'number') {
    cards.push({
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.asegurables', 'Asegurables'),
      value: String(k.asegurablesCount),
      Icon: ShieldCheck,
    })
  }
  if (k && typeof k.tasaAsegurabilidad === 'number') {
    cards.push({
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.tasaAsegurabilidad', 'Tasa de asegurabilidad'),
      value: `${(k.tasaAsegurabilidad * 100).toFixed(0)}%`,
      Icon: CheckCircle,
    })
  }
  if (k && typeof k.multiOpcionCount === 'number') {
    cards.push({
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.multiOpcion', 'Con varias opciones'),
      value: String(k.multiOpcionCount),
      Icon: Stack,
    })
  }
  if (k && typeof k.sinAseguradoraCount === 'number') {
    cards.push({
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.sinAseguradora', 'Sin aseguradora'),
      value: String(k.sinAseguradoraCount),
      Icon: ShieldSlash,
    })
  }
  if (k && typeof k.tiempoRespuestaSeconds === 'number') {
    const secs = k.tiempoRespuestaSeconds
    const value = secs >= 60 ? `${(secs / 60).toFixed(1)}m` : `${Math.round(secs)}s`
    cards.push({
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.tiempoRespuesta', 'Tiempo de respuesta'),
      value,
      Icon: Timer,
    })
  }
  if (k && typeof k.arriendosCerrados === 'number') {
    cards.push({
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.arriendosCerrados', 'Arriendos cerrados'),
      value: String(k.arriendosCerrados),
      Icon: House,
    })
  }
  if (k && typeof k.valorAseguradoCop === 'number') {
    cards.push({
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.valorAsegurado', 'Valor asegurado'),
      value: `$${formatCOP(k.valorAseguradoCop)}`,
      Icon: Vault,
    })
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, Icon }) => (
        <KpiCard
          key={label}
          label={label}
          value={isLoading ? '—' : value}
          icon={<Icon weight="duotone" aria-hidden="true" />}
        />
      ))}
    </div>
  )
}
