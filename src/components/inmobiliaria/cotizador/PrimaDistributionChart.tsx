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
import { nombreDeLaAseguradora } from '@/lib/cotizador/nombre-de-la-aseguradora'
import type { PrimaDistributionRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// Colores — tokens del tema, no hex (recharts pinta atributos SVG y el
// navegador resuelve `var(--…)` en ellos). Cada barra va en el color de su
// aseguradora (el de la leyenda); el bigote p25–p75, en el del eje.
// ---------------------------------------------------------------------------
const RANGO = 'hsl(var(--primary))'
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
// La figura de cada aseguradora (COTIZ-16, QA 19-10-2026): la BARRA llega hasta
// la mediana (p50), en el color de su aseguradora (el mismo de la leyenda), y
// un BIGOTE marca de p25 a p75. Antes la barra era sólo el rango p25→p75: con
// pocas cotizaciones el rango es un punto y la barra salía como una raya.
// ---------------------------------------------------------------------------
function makeRangeBar(carrier: string) {
  // Returns a function-shape compatible with Recharts' ActiveShape
  return function CarrierRangeBar(props: Record<string, unknown>) {
    const x = (props.x as number) ?? 0
    const y = (props.y as number) ?? 0
    const width = (props.width as number) ?? 0
    const height = (props.height as number) ?? 0
    const fill = (props.fill as string) ?? RANGO
    const p25 = (props[`${carrier}_p25`] as number) ?? 0
    const p50 = (props[`${carrier}_p50`] as number) ?? 0
    const p75 = (props[`${carrier}_p75`] as number) ?? 0
    if (p75 <= 0 || height <= 0) return <g />

    // Recharts dibujó la barra hasta p75: y = p75, y + height = 0.
    const baseline = y + height
    const pixelsPerUnit = height / p75
    const enPx = (v: number) => baseline - v * pixelsPerUnit
    const p50Px = enPx(p50 > 0 ? p50 : p75)
    const p25Px = enPx(p25)

    const barX = x + width * 0.15
    const barWidth = Math.max(width * 0.7, 4)
    const centro = barX + barWidth / 2
    const tapa = Math.min(barWidth / 3, 6)
    const hayRango = p25Px - y >= 2

    return (
      <g>
        <rect x={barX} y={p50Px} width={barWidth} height={Math.max(baseline - p50Px, 2)} fill={fill} fillOpacity={0.6} rx={2} />
        {hayRango && (
          <g stroke={EJE} strokeWidth={1.5}>
            <line x1={centro} x2={centro} y1={y} y2={p25Px} />
            <line x1={centro - tapa} x2={centro + tapa} y1={y} y2={y} />
            <line x1={centro - tapa} x2={centro + tapa} y1={p25Px} y2={p25Px} />
          </g>
        )}
      </g>
    )
  }
}

/** «$138.700» (pesos enteros, como el resto del cotizador). */
function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CO')}`
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
    <div className="space-y-1">
    {/* COTIZ-16: el rótulo del eje va arriba, en texto: girado dentro del SVG
        se cortaba en «Prima mensual (CO». */}
    <p className="text-caption text-fg-muted" data-testid="prima-eje-y">
      {t('inmobiliaria.ai.cotizador.insights.charts.primaDistribution.yAxisLabel')}
    </p>
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
        />
        <Tooltip
          // COTIZ-16: la mediana y el rango, con el nombre de la aseguradora.
          formatter={(_value: unknown, name: unknown, item: { dataKey?: unknown; payload?: Record<string, unknown> }) => {
            const codigo = String(item?.dataKey ?? '')
            const fila = item?.payload ?? {}
            const p25 = Number(fila[`${codigo}_p25`] ?? 0)
            const p50 = Number(fila[`${codigo}_p50`] ?? 0)
            const p75 = Number(fila[`${codigo}_p75`] ?? 0)
            const texto =
              p75 <= 0
                ? 'Sin cotizaciones'
                : p25 === p75
                  ? pesos(p50 || p75)
                  : `${pesos(p50)} (de ${pesos(p25)} a ${pesos(p75)})`
            return [texto, String(name)]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
        {carriers.map((carrier, idx) => {
          const ShapeComponent = makeRangeBar(carrier)
          return (
            <Bar
              key={carrier}
              dataKey={carrier}
              name={nombreDeLaAseguradora(carrier)}
              fill={CARRIER_COLORS[idx % CARRIER_COLORS.length]}
              shape={<ShapeComponent />}
            />
          )
        })}
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
