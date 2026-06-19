'use client'

/**
 * CarrierApprovalByCanonChart.tsx — Phase 35 plan 35-08 (Task 2)
 *
 * Recharts horizontal BarChart at 220px height.
 * layout="vertical" draws horizontal bars: Y axis has categories, X axis has values.
 * Fill: electric-blue (#1A40FF). 4 canon-range buckets: [0-1M], [1M-3M], [3M-5M], [5M+].
 * Must declare 'use client' — ResponsiveContainer needs DOM access (T-35-12).
 */

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { useI18n } from '@/lib/i18n'

// =============================================================================
// Props
// =============================================================================

interface CarrierApprovalByCanonChartProps {
  data: Array<{ canonRange: string; approvalRate: number }>
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function CarrierApprovalByCanonChart({ data, isLoading = false }: CarrierApprovalByCanonChartProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className="text-xs text-neutral-400 text-center py-8">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.noApprovalData')}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical">
        <XAxis
          type="number"
          domain={[0, 1]}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          type="category"
          dataKey="canonRange"
          tick={{ fontSize: 10 }}
          width={60}
        />
        <Tooltip
          formatter={(v) => [
            `${(Number(v) * 100).toFixed(1)}%`,
            t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.approvalByCanon.tooltipLabel'),
          ]}
        />
        <Bar
          dataKey="approvalRate"
          fill="#1A40FF"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
