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
import { FranjaDeCifras, KpiCard } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * QA-IA-95 (05-10-2026): la plata como en la casa («$ 54.600», «$ 1.400.000»),
 * no «$55K» ni «$1.4M» (abreviaturas y punto decimal en inglés).
 * Al peso (QA 19-10-2026): la prima promedio y el costo por consulta son
 * promedios calculados, no plata guardada; sin redondear decían «$ 132.328,57».
 */
function formatCOP(value: number): string {
  return formatCurrency(Math.round(value))
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
      value: kpis ? `${(kpis.approvalRate * 100).toFixed(0)} %` : '—',
      Icon: CheckCircle,
    },
    {
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.primaPromedio', 'Prima promedio/mes'),
      value: kpis ? `${formatCOP(kpis.primaPromedioMonthlyCop)}` : '—',
      Icon: ShieldStar,
    },
    {
      label: tf('inmobiliaria.ai.cotizador.overview.kpis.costPerQuote', 'Costo por consulta'),
      value: kpis ? `${formatCOP(kpis.costPerQuoteCop)}` : '—',
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
      value: `${(k.tasaAsegurabilidad * 100).toFixed(0)} %`,
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
      value: `${formatCOP(k.valorAseguradoCop)}`,
      Icon: Vault,
    })
  }

  /*
   * Revisora r25 (lista negra §3): con las opcionales la franja juntaba hasta 11 cifras del
   * mismo peso. Ahora: arriba LA RESPUESTA —cuántas consultas salieron asegurables— cuando el
   * back la manda; la franja con las cuatro de siempre; y las demás, plegadas.
   */
  const base = cards.slice(0, 4)
  const asegurables = k && typeof k.asegurablesCount === 'number' ? k.asegurablesCount : null
  // Lo que ya dice la cifra de arriba (cuántas y qué porcentaje) no se repite plegado.
  const yaArriba = asegurables === null
    ? new Set<string>()
    : new Set([
        tf('inmobiliaria.ai.cotizador.overview.kpis.asegurables', 'Asegurables'),
        tf('inmobiliaria.ai.cotizador.overview.kpis.tasaAsegurabilidad', 'Tasa de asegurabilidad'),
      ])
  const masCifras = cards.slice(4).filter((c) => !yaArriba.has(c.label))
  const franja = (lista: Card[], testId: string) => (
    <FranjaDeCifras
      fila="lg"
      aria-label={tf('inmobiliaria.ai.cotizador.overview.kpis.titulo', 'Resumen de asegurabilidad')}
      data-testid={testId}
    >
      {lista.map(({ label, value, Icon }) => (
        <KpiCard
          key={label}
          label={label}
          value={isLoading ? '—' : value}
          icon={<Icon weight="duotone" aria-hidden="true" />}
        />
      ))}
    </FranjaDeCifras>
  )
  return (
    <div className="space-y-4">
      {asegurables !== null && !isLoading ? (
        <CifraHeroe
          rotulo={tf('inmobiliaria.ai.cotizador.overview.kpis.asegurables', 'Asegurables')}
          cifra={asegurables.toLocaleString('es-CO')}
          contexto={
            typeof k?.tasaAsegurabilidad === 'number'
              ? `${(k.tasaAsegurabilidad * 100).toFixed(0)} % de las consultas`
              : undefined
          }
          tamano="mediana"
          data-testid="cotizador-asegurables"
        />
      ) : null}
      {franja(base, 'cotizador-cifras')}
      {masCifras.length > 0 ? (
        <MasDetalles etiqueta="Más cifras de asegurabilidad" data-testid="cotizador-mas-cifras">
          <div className="mt-3">{franja(masCifras, 'cotizador-cifras-mas')}</div>
        </MasDetalles>
      ) : null}
    </div>
  )
}
