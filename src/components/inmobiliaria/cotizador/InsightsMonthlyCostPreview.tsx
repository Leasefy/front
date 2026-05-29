'use client'

import Link from 'next/link'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import type { MonthlyCostTrendRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InsightsMonthlyCostPreviewProps {
  trend: MonthlyCostTrendRow[] | null
  isLoading?: boolean
}

function formatMonth(isoMonth: string): string {
  // "2026-01" → "Ene 26"
  const [year, month] = isoMonth.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InsightsMonthlyCostPreview({
  trend,
  isLoading,
}: InsightsMonthlyCostPreviewProps) {
  const { t } = useI18n()

  // Loading skeleton
  if (isLoading && trend === null) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-[160px] bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
        <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded" />
      </div>
    )
  }

  // Empty / no data state
  if (!trend || trend.length === 0) {
    return (
      <div className="space-y-4">
        <NoDataYetBadge
          reason={t('inmobiliaria.ai.cotizador.insights.costPreview.empty')}
          phase={35}
        />
        <div className="text-center">
          <Link
            href="../costos"
            className="text-xs text-indigo-500 hover:text-indigo-600 underline"
          >
            {t('inmobiliaria.ai.cotizador.insights.costPreview.viewAll')}
          </Link>
        </div>
      </div>
    )
  }

  // Show last 6 months of data
  const sliced = trend.slice(-6)

  // CRITICAL: cost values come back as strings (Decimal/BigInt safety from 35-04).
  // Parse via parseFloat before rendering.
  const chartData = sliced.map((row) => ({
    month: row.month,
    total: parseFloat(row.total) || 0,
  }))

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 9 }}
            tickFormatter={formatMonth}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tick={{ fontSize: 9 }}
            width={48}
          />
          <Tooltip
            formatter={(value: unknown) => {
              const n = typeof value === 'number' ? value : parseFloat(String(value)) || 0
              return [`$${n.toFixed(2)} USD`]
            }}
            labelFormatter={(label: unknown) => formatMonth(String(label))}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#4f46e5"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-center">
        <Link
          href="../costos"
          className="text-xs text-indigo-500 hover:text-indigo-600 underline"
        >
          {t('inmobiliaria.ai.cotizador.insights.costPreview.viewAll')}
        </Link>
      </div>
    </div>
  )
}
