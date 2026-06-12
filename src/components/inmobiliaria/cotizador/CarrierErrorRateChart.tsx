'use client'

/**
 * CarrierErrorRateChart.tsx — Phase 35 plan 35-08 (Task 2)
 *
 * Recharts LineChart at 160px height showing error rate over time.
 * Stroke: rose-500 (#f43f5e). Reference line at 5% threshold (rose-300 dashed).
 * Must declare 'use client' — ResponsiveContainer needs DOM access (T-35-12).
 */

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { useI18n } from '@/lib/i18n'

// =============================================================================
// Props
// =============================================================================

interface CarrierErrorRateChartProps {
  data: Array<{ date: string; errorRate: number }>
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function CarrierErrorRateChart({ data, isLoading = false }: CarrierErrorRateChartProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="h-[160px] flex items-center justify-center">
        <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-[160px] flex items-center justify-center">
        <p className="text-xs text-neutral-400 text-center py-8">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.noErrorRateData')}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
        />
        <Tooltip
          formatter={(v) => [
            `${(Number(v) * 100).toFixed(2)}%`,
            t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.errorRate.tooltipLabel'),
          ]}
        />
        {/* 5% threshold reference line (rose-300 = #fca5a5) */}
        <ReferenceLine y={0.05} stroke="#fca5a5" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="errorRate"
          stroke="#f43f5e"
          dot={false}
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
