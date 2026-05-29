'use client'

/**
 * CarrierLatencySparkline.tsx — Phase 35 plan 35-08 (Task 2)
 *
 * Recharts LineChart at 160px height showing latency p95 over time.
 * Stroke: teal-500 (#14b8a6). ResponsiveContainer width="100%".
 * Must declare 'use client' — ResponsiveContainer needs DOM access (T-35-12).
 */

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { useI18n } from '@/lib/i18n'

// =============================================================================
// Props
// =============================================================================

interface CarrierLatencySparklineProps {
  data: Array<{ hour: string; p95LatencyMs: number }>
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function CarrierLatencySparkline({ data, isLoading = false }: CarrierLatencySparklineProps) {
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
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.noLatencyData')}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data}>
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}ms`} />
        <Tooltip
          formatter={(v) => [
            `${v}ms`,
            t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.latency.tooltipLabel'),
          ]}
        />
        <Line
          type="monotone"
          dataKey="p95LatencyMs"
          stroke="#14b8a6"
          dot={false}
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
