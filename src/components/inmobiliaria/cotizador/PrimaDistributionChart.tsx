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
import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import type { PrimaDistributionRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// RangeBar custom shape
// ---------------------------------------------------------------------------
// Recharts injects { x, y, width, height, value, ...rest } into the shape.
// For a Bar with dataKey="p75", Recharts computes:
//   y     = pixel position of the bar top (p75 value mapped to chart Y)
//   height = pixel height from y to the baseline (0 or chart bottom)
// We need to render p25→p75 as a colored rect and p50 as a white tick line.
// The additional p25/p50 values are passed as extra props via the data array.

interface RangeBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  // These come from the data array row (same object as Bar dataKey row)
  p25Px?: number    // pre-computed pixel Y for p25
  p50Px?: number    // pre-computed pixel Y for p50
  p75Px?: number    // pre-computed pixel Y for p75 (same as y for Bar)
}

function RangeBar(props: RangeBarProps) {
  const { x = 0, y = 0, width = 0, p25Px, p50Px } = props

  // The bar top is at y (p75 mapped), but we need the p25→p75 range.
  // p25Px and p50Px are pre-computed by the parent component using the YAxis scale.
  // If not available (initial render), fall back to the bar itself.
  const rectTop = y
  const rectBottom = p25Px ?? y + 40 // fallback
  const rectHeight = Math.max(rectBottom - rectTop, 2)

  const p50Y = p50Px ?? rectTop + rectHeight / 2
  const barX = x + width * 0.15
  const barWidth = width * 0.7

  return (
    <g>
      {/* p25→p75 range rectangle */}
      <rect
        x={barX}
        y={rectTop}
        width={barWidth}
        height={rectHeight}
        fill="#8A9CFF"
        fillOpacity={0.6}
        rx={2}
      />
      {/* p50 median tick line */}
      <line
        x1={barX}
        x2={barX + barWidth}
        y1={p50Y}
        y2={p50Y}
        stroke="white"
        strokeWidth={2}
      />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Props & data transformation
// ---------------------------------------------------------------------------
interface PrimaDistributionChartProps {
  data: PrimaDistributionRow[] | null
  isLoading?: boolean
}

// Pivot data by canon_range for the X axis.
// Pre-compute pixel positions using a simple linear scale since we cannot
// easily access Recharts' internal YAxis scale here. Instead, we pass the
// raw p25/p50/p75 values and compute pixel coords inside a wrapper that has
// access to the chart's full Y domain.
//
// Simpler approach: use a single flat BarChart grouped by carrier per X tick
// (canonRange), and encode the p25/p50 values as extra fields on the data row
// so RangeBar can compute the relative offsets itself using the injected props.

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
// 5-color carrier palette
// ---------------------------------------------------------------------------
const CARRIER_COLORS = [
  '#1A40FF', // electric-blue (primary)
  '#8A9CFF', // blue-tint
  '#6B6B6B', // neutral-mid
  '#9B9B9B', // neutral-light
  '#C9CDD3', // neutral-pale
]

// ---------------------------------------------------------------------------
// Custom shape factory per carrier (closure captures carrier name for p25/p50 lookup)
// ---------------------------------------------------------------------------
function makeRangeBar(carrier: string, yMax: number, chartHeight: number) {
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
          fill="#8A9CFF"
          fillOpacity={0.6}
          rx={2}
        />
        <line
          x1={barX}
          x2={barX + barWidth}
          y1={p50Px}
          y2={p50Px}
          stroke="white"
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
      <div className="h-[260px] space-y-3 animate-pulse">
        <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="h-[220px] bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center">
        <NoDataYetBadge
          reason={t('inmobiliaria.ai.cotizador.insights.primaDistributionTitle')}
          phase={35}
        />
      </div>
    )
  }

  const { chartData, carriers, yMax } = buildChartData(data)
  const CHART_HEIGHT = 260

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <XAxis
          dataKey="canonRange"
          tick={{ fontSize: 10 }}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.primaDistribution.xAxisLabel'),
            position: 'insideBottom',
            offset: -4,
            fontSize: 10,
          }}
        />
        <YAxis
          domain={[0, yMax]}
          tickFormatter={(v: number) =>
            v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`
          }
          tick={{ fontSize: 10 }}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.primaDistribution.yAxisLabel'),
            angle: -90,
            position: 'insideLeft',
            fontSize: 10,
          }}
        />
        <Tooltip
          formatter={(value: unknown) => {
            const n = typeof value === 'number' ? value : 0
            return [`$${(n / 1000).toFixed(0)}K`]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {carriers.map((carrier, idx) => {
          const ShapeComponent = makeRangeBar(carrier, yMax, CHART_HEIGHT)
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
