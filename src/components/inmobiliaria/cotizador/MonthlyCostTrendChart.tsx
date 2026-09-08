'use client'

/**
 * MonthlyCostTrendChart.tsx — Phase 35 plan 35-10
 *
 * Recharts LineChart 240px showing monthly cost trends:
 *   - Historical rows: cobalto (`--primary`) solid line
 *   - Forecast rows: `--fg-subtle` dotted line (strokeDasharray="4 4")
 *   - ReferenceLine at the current month boundary
 *
 * Los colores son tokens del tema, no hex: recharts pinta atributos SVG y el
 * navegador resuelve `var(--…)` en ellos, así que el gráfico sigue al tema
 * oscuro sin una segunda paleta.
 *
 * Props accept raw rows from the /costos/series endpoint.
 * Cost values from backend arrive as numbers; use parseFloat() if needed upstream.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useI18n } from '@/lib/i18n'
import type { CostSeriesRow } from '@/lib/hooks/cotizador/use-costos'

const HISTORICO = 'hsl(var(--primary))'
const PRONOSTICO = 'var(--fg-subtle)'
const EJE = 'var(--fg-muted)'
const BORDE = 'var(--border-faint)'

// =============================================================================
// Types
// =============================================================================

interface MonthlyCostTrendChartProps {
  rows: Array<Pick<CostSeriesRow, 'period' | 'total' | 'isForecast'>>
  isLoading?: boolean
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format the current month as a period label matching the series data format
 * (e.g. "May 26" for 2026-05).
 */
function getCurrentPeriodLabel(): string {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'short' })
  const year = String(now.getFullYear()).slice(2)
  return `${month} ${year}`
}

// =============================================================================
// Component
// =============================================================================

export function MonthlyCostTrendChart({ rows, isLoading = false }: MonthlyCostTrendChartProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div
        className="h-[240px] w-full rounded bg-surface-muted animate-pulse"
        role="status"
        aria-label="Cargando"
      >
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  // Historical rows — solid cobalt line
  const historicalRows = rows.filter(r => !r.isForecast)
  // Forecast rows — dotted muted line
  const forecastRows = rows.filter(r => r.isForecast === true)

  // Today's period boundary for the ReferenceLine
  const todayPeriod = getCurrentPeriodLabel()

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        // We pass historicalRows as base data so the x-axis covers the full range
        data={rows}
      >
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: EJE }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `$${v}`}
          tick={{ fontSize: 10, fill: EJE }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value: unknown) => [`$${Number(value).toFixed(4)}`, '']}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${BORDE}`,
            background: 'var(--surface)',
            color: 'var(--fg)',
          }}
        />

        {/* ReferenceLine at today's month boundary */}
        <ReferenceLine
          x={todayPeriod}
          stroke={PRONOSTICO}
          strokeDasharray="2 2"
          label={{
            value: t('inmobiliaria.ai.cotizador.costos.charts.monthlyCostTrend.todayLabel'),
            position: 'top',
            fontSize: 10,
            fill: PRONOSTICO,
          }}
        />

        {/* Historical line — solid cobalt, rendered over all rows */}
        <Line
          data={historicalRows}
          dataKey="total"
          stroke={HISTORICO}
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
          name={t('inmobiliaria.ai.cotizador.costos.charts.monthlyCostTrend.historicalSeries')}
        />

        {/* Forecast extension — dotted muted */}
        {forecastRows.length > 0 && (
          <Line
            data={forecastRows}
            dataKey="total"
            stroke={PRONOSTICO}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
            name={t('inmobiliaria.ai.cotizador.costos.charts.monthlyCostTrend.forecastSeries')}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
