'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartLineUp } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { SinDatos } from '@/components/estado/SinDatos'
import type { ApprovalRateMonthlyRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// Paleta por aseguradora — tokens del tema, no hex. Cobalto para la primera
// y los tonos de apoyo de `--chart-*` (definidos en globals.css con su
// contraparte oscura) para las siguientes; recharts pinta atributos SVG y el
// navegador resuelve `var(--…)` en ellos.
// ---------------------------------------------------------------------------
const CARRIER_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

const EJE = 'var(--fg-muted)'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ApprovalRateMonthlyChartProps {
  data: ApprovalRateMonthlyRow[] | null
  isLoading?: boolean
}

// Recharts requires a flat array of objects keyed by XAxis dataKey.
// We pivot: [{ month, [carrier]: value, ... }, ...]
type PivotRow = Record<string, string | number>

function pivotData(rows: ApprovalRateMonthlyRow[]): PivotRow[] {
  const byMonth: Record<string, PivotRow> = {}
  for (const row of rows) {
    if (!byMonth[row.month]) {
      byMonth[row.month] = { month: row.month }
    }
    byMonth[row.month][row.carrier] = row.approval_rate_pct
  }
  return Object.values(byMonth).sort((a, b) =>
    String(a.month).localeCompare(String(b.month)),
  )
}

function formatMonth(isoMonth: string): string {
  // "2026-01" → "Ene 2026"
  const [year, month] = isoMonth.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ApprovalRateMonthlyChart({
  data,
  isLoading,
}: ApprovalRateMonthlyChartProps) {
  const { t } = useI18n()

  // Loading skeleton
  if (isLoading && data === null) {
    return (
      <div className="h-[280px] space-y-3 animate-pulse" role="status" aria-label="Cargando">
        <div className="h-4 w-32 bg-surface-muted rounded" />
        <div className="h-[240px] bg-surface-muted rounded-lg" />
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  // El vacío de la casa, sin «Fase 35»: la persona no tiene por qué leer el
  // nombre interno de una etapa del roadmap.
  if (!data || data.length === 0) {
    return (
      <SinDatos
        queSon="aprobaciones"
        icono={ChartLineUp}
        titulo="Todavía no hay tasa de aprobación"
        descripcion="Cuando las aseguradoras respondan consultas de varios meses, la tasa por aseguradora se grafica acá."
        className="py-10"
      />
    )
  }

  const carriers = Array.from(new Set(data.map((d) => d.carrier)))
  const chartData = pivotData(data)

  return (
    <ResponsiveContainer width="100%" height={300}>
      {/* El margen de abajo le da sitio al rótulo del eje y a la leyenda: con 8 px
          la leyenda se montaba sobre «Mes». */}
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 28, left: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: EJE }}
          tickFormatter={formatMonth}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.approvalRateMonthly.xAxisLabel'),
            position: 'insideBottom',
            offset: -12,
            fontSize: 10,
            fill: EJE,
          }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 10, fill: EJE }}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.approvalRateMonthly.yAxisLabel'),
            angle: -90,
            position: 'insideLeft',
            fontSize: 10,
            fill: EJE,
          }}
        />
        <Tooltip
          formatter={(value: unknown) => [`${value}%`]}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
        {/* Rectas y con punto: la curva «monotone» dibujaba lomas entre dos
            meses (0 % → 100 % → 0 %) que ningún dato respalda, y sin punto un
            mes suelto no se veía. Un mes sin consulta queda como hueco. */}
        {carriers.map((carrier, idx) => (
          <Line
            key={carrier}
            type="linear"
            dataKey={carrier}
            stroke={CARRIER_COLORS[idx % CARRIER_COLORS.length]}
            dot={{ r: 3 }}
            connectNulls={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
