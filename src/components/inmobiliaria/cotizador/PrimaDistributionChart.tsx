'use client'

// PRIMARY PATH: Custom RangeBar shape via Recharts Bar shape prop.
// Decision recorded in .recharts-shape-decision.md (Task 0 gate):
//   "SHAPE_API: primary — custom shape prop supported"
// Recharts v3.8.1 Bar shape prop type = ActiveShape<BarShapeProps, SVGPathElement>
//   which accepts ReactElement | function | SVGProps | boolean.

import { useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartBar } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { SinDatos } from '@/components/estado/SinDatos'
import type { PrimaDistributionRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// Colores — tokens del tema, no hex (recharts pinta atributos SVG y el
// navegador resuelve `var(--…)` en ellos). El rango p25→p75 va en cobalto
// atenuado; la mediana, en el color de la superficie para que se lea sobre
// el rango en los dos temas (antes era `white`, invisible en oscuro).
// ---------------------------------------------------------------------------
const RANGO = 'hsl(var(--primary))'
const MEDIANA = 'var(--surface)'
const EJE = 'var(--fg-muted)'

// ---------------------------------------------------------------------------
// Props & data transformation
// ---------------------------------------------------------------------------
interface PrimaDistributionChartProps {
  data: PrimaDistributionRow[] | null
  isLoading?: boolean
}

// Pivot data by canon_range for the X axis. Use a single flat BarChart grouped
// by carrier per X tick (canonRange), and encode the p25/p50 values as extra
// fields on the data row so RangeBar can compute the relative offsets itself
// using the injected props.

type ChartRow = {
  canonRange: string
  [carrier: string]: string | number
}

type ExtChartRow = ChartRow & {
  [key: `${string}_p25`]: number
  [key: `${string}_p50`]: number
  [key: `${string}_p75`]: number
}

function buildChartData(rows: PrimaDistributionRow[]): {
  chartData: ExtChartRow[]
  carriers: string[]
  yMax: number
} {
  const carriers = Array.from(new Set(rows.map((r) => r.carrier)))
  const canonRanges = Array.from(new Set(rows.map((r) => r.canon_range)))
  const yMax = Math.max(...rows.map((r) => r.p75), 1)

  const chartData = canonRanges.map((cr) => {
    const row: ExtChartRow = { canonRange: cr } as ExtChartRow
    for (const carrier of carriers) {
      const match = rows.find((r) => r.canon_range === cr && r.carrier === carrier)
      row[carrier] = match?.p75 ?? 0
      row[`${carrier}_p25`] = match?.p25 ?? 0
      row[`${carrier}_p50`] = match?.p50 ?? 0
      row[`${carrier}_p75`] = match?.p75 ?? 0
    }
    return row
  })

  return { chartData, carriers, yMax }
}

// ---------------------------------------------------------------------------
// Paleta por aseguradora (leyenda): cobalto y los tonos de apoyo del tema.
// ---------------------------------------------------------------------------
const CARRIER_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

// ---------------------------------------------------------------------------
// Custom shape factory per carrier (closure captures carrier name for p25/p50 lookup)
// ---------------------------------------------------------------------------
function makeRangeBar(carrier: string) {
  // Returns a function-shape compatible with Recharts' ActiveShape
  return function CarrierRangeBar(props: Record<string, unknown>) {
    const x = (props.x as number) ?? 0
    const y = (props.y as number) ?? 0
    const width = (props.width as number) ?? 0
    const height = (props.height as number) ?? 0
    const p25 = (props[`${carrier}_p25`] as number) ?? 0
    const p50 = (props[`${carrier}_p50`] as number) ?? 0
    const p75 = (props[`${carrier}_p75`] as number) ?? 0

    // Convert values to pixel coords using the same scale Recharts used for p75
    // y is the top of the bar (p75 pixel), y+height is the baseline (0 pixel)
    const baseline = y + height // pixel for value=0
    const topPx = y            // pixel for p75

    // Scale: pixelsPerUnit = height / p75 (if p75 > 0)
    const pixelsPerUnit = p75 > 0 ? height / p75 : 0
    const p25Px = p25 > 0 ? baseline - p25 * pixelsPerUnit : baseline
    const p50Px = p50 > 0 ? baseline - p50 * pixelsPerUnit : baseline - height / 2

    const rectTop = topPx
    const rectHeight = Math.max(p25Px - topPx, 2)

    const barX = x + width * 0.1
    const barWidth = Math.max(width * 0.8, 2)

    return (
      <g>
        <rect
          x={barX}
          y={rectTop}
          width={barWidth}
          height={rectHeight}
          fill={RANGO}
          fillOpacity={0.6}
          rx={2}
        />
        <line
          x1={barX}
          x2={barX + barWidth}
          y1={p50Px}
          y2={p50Px}
          stroke={MEDIANA}
          strokeWidth={2}
        />
      </g>
    )
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function PrimaDistributionChart({
  data,
  isLoading,
}: PrimaDistributionChartProps) {
  const { t } = useI18n()

  // DEV-ONLY assertion: after first render, verify RangeBar shapes rendered
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (!data || data.length === 0) return

    const timer = setTimeout(() => {
      const rects = document.querySelectorAll('[fill-opacity="0.6"]')
      if (rects.length === 0) {
        console.error(
          '[PrimaDistributionChart] ESCALATION: RangeBar shape did not render — ' +
            'check Recharts shape prop API. Revert to ComposedChart fallback.',
        )
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [data])

  // Loading skeleton
  if (isLoading && data === null) {
    return (
      <div className="h-[260px] space-y-3 animate-pulse" role="status" aria-label="Cargando">
        <div className="h-4 w-48 bg-surface-muted rounded" />
        <div className="h-[220px] bg-surface-muted rounded-lg" />
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  // El vacío de la casa, sin «Fase 35».
  if (!data || data.length === 0) {
    return (
      <SinDatos
        queSon="primas"
        icono={ChartBar}
        titulo="Todavía no hay distribución de prima"
        descripcion="Cuando haya primas cotizadas en varios rangos de canon, la distribución por aseguradora se grafica acá."
        className="py-10"
      />
    )
  }

  const { chartData, carriers, yMax } = buildChartData(data)
  const CHART_HEIGHT = 260

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      {/* Margen de abajo para que la leyenda no se monte sobre «Rango de canon». */}
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 28, left: 0 }}>
        <XAxis
          dataKey="canonRange"
          tick={{ fontSize: 10, fill: EJE }}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.primaDistribution.xAxisLabel'),
            position: 'insideBottom',
            offset: -12,
            fontSize: 10,
            fill: EJE,
          }}
        />
        <YAxis
          domain={[0, yMax]}
          tickFormatter={(v: number) =>
            v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`
          }
          tick={{ fontSize: 10, fill: EJE }}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.primaDistribution.yAxisLabel'),
            angle: -90,
            position: 'insideLeft',
            fontSize: 10,
            fill: EJE,
          }}
        />
        <Tooltip
          formatter={(value: unknown) => {
            const n = typeof value === 'number' ? value : 0
            return [`$${(n / 1000).toFixed(0)}K`]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
        {carriers.map((carrier, idx) => {
          const ShapeComponent = makeRangeBar(carrier)
          return (
            <Bar
              key={carrier}
              dataKey={carrier}
              name={carrier}
              fill={CARRIER_COLORS[idx % CARRIER_COLORS.length]}
              shape={<ShapeComponent />}
            />
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}
