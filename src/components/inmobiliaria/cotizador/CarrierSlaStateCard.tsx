'use client'

/**
 * CarrierSlaStateCard.tsx — Phase 35 plan 35-08 (Task 3)
 *
 * SLA state card with semantic color (emerald/amber/rose), since-timestamp,
 * reason text, and 30d combined sparkline (latency + error rate side-by-side).
 */

import { ShieldCheck, Warning } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { CarrierLatencySparkline } from './CarrierLatencySparkline'

// =============================================================================
// Types
// =============================================================================

type SlaState = 'healthy' | 'degraded' | 'breached' | null

// =============================================================================
// Color maps
// =============================================================================

const SLA_COLORS: Record<string, string> = {
  healthy: 'text-[#2C7A53] dark:text-[#3EAE70]',
  degraded: 'text-[#B7791F] dark:text-[#D2992F]',
  breached: 'text-[#C4503B] dark:text-[#E0664D]',
}

const SLA_BG: Record<string, string> = {
  healthy: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
  degraded: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
  breached: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
}

// =============================================================================
// Helpers
// =============================================================================

function formatElapsed(since: string | null, t: (key: string) => string): string {
  if (!since) return t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.since.unknown')
  const diffMs = Date.now() - new Date(since).getTime()
  const totalMinutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

// =============================================================================
// Props
// =============================================================================

// SLA errorRateSparkline uses `hour` key (unlike CarrierErrorRateChart which uses `date`)
interface SlaErrorRatePoint {
  hour: string
  errorRate: number
}

interface CarrierSlaStateCardProps {
  state: SlaState
  since: string | null
  reason: string | null
  p95Sparkline: Array<{ hour: string; p95LatencyMs: number }>
  errorRateSparkline: SlaErrorRatePoint[]
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function CarrierSlaStateCard({
  state,
  since,
  reason,
  p95Sparkline,
  errorRateSparkline,
  isLoading = false,
}: CarrierSlaStateCardProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="h-5 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        </div>
      </div>
    )
  }

  const resolvedState = state ?? 'healthy'
  const colorClass = SLA_COLORS[resolvedState] ?? SLA_COLORS.healthy
  const bgClass = SLA_BG[resolvedState] ?? SLA_BG.healthy
  const stateLabel = t(`inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.${resolvedState}`)

  const Icon = resolvedState === 'healthy' ? ShieldCheck : Warning
  const iconWeight = resolvedState === 'breached' ? 'fill' : 'duotone'

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5 space-y-5">
      {/* State pill */}
      <div className={`flex flex-col items-center gap-2 rounded-md p-4 ${bgClass}`}>
        <Icon weight={iconWeight} className={`h-8 w-8 ${colorClass}`} />
        <p className={`text-lg font-semibold ${colorClass}`}>{stateLabel}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.since')}{' '}
          {formatElapsed(since, t)}
        </p>
        {reason && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 text-center">{reason}</p>
        )}
      </div>

      {/* 30d sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 mb-2">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.latency.title')}
          </p>
          <CarrierLatencySparkline data={p95Sparkline} />
        </div>
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 mb-2">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.errorRate.title')}
          </p>
          {errorRateSparkline.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center">
              <p className="text-xs text-neutral-400 text-center">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.noErrorRateData')}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={errorRateSparkline}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                <Tooltip
                  formatter={(v) => [
                    `${(Number(v) * 100).toFixed(2)}%`,
                    t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.errorRate.tooltipLabel'),
                  ]}
                />
                <ReferenceLine y={0.05} stroke="#E0A89E" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="errorRate" stroke="#C4503B" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
