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
import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import type { ApprovalRateMonthlyRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// 5-color carrier palette (D-35-05 / UI-SPEC)
// ---------------------------------------------------------------------------
const CARRIER_COLORS = [
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#f43f5e', // rose-500
]

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
      <div className="h-[280px] space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="h-[240px] bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <NoDataYetBadge
          reason={t('inmobiliaria.ai.cotizador.insights.approvalRateMonthlyTitle')}
          phase={35}
        />
      </div>
    )
  }

  const carriers = Array.from(new Set(data.map((d) => d.carrier)))
  const chartData = pivotData(data)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10 }}
          tickFormatter={formatMonth}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.approvalRateMonthly.xAxisLabel'),
            position: 'insideBottom',
            offset: -4,
            fontSize: 10,
          }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 10 }}
          label={{
            value: t('inmobiliaria.ai.cotizador.insights.charts.approvalRateMonthly.yAxisLabel'),
            angle: -90,
            position: 'insideLeft',
            fontSize: 10,
          }}
        />
        <Tooltip
          formatter={(value: unknown) => [`${value}%`]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {carriers.map((carrier, idx) => (
          <Line
            key={carrier}
            type="monotone"
            dataKey={carrier}
            stroke={CARRIER_COLORS[idx % CARRIER_COLORS.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
