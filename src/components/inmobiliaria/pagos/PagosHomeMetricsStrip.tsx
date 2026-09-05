'use client'

/**
 * PagosHomeMetricsStrip — Pagos IA Home, widget HOME-01.
 *
 * 8 KPI tiles built from the `KPICard` DS primitive in a responsive grid.
 * The 2 COP-valued metrics are NOT animated counters (KPICard animates raw
 * integers) — they render as formatted currency text tiles so "$ 12.500.000"
 * shows correctly instead of a counted-up bare integer. The other 6 are plain
 * counts and use KPICard directly.
 *
 * Pure presentational: receives the metrics object + loading/error flags from
 * the client. Handles its own loading skeleton / error / empty branches so the
 * page degrades gracefully (preview / flag-gated work).
 */

import type { Icon } from '@phosphor-icons/react'
import {
  CalendarCheck,
  PaperPlaneTilt,
  CheckCircle,
  LinkSimple,
  XCircle,
  CurrencyDollar,
  UserCheck,
  Wallet,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { KPICard } from '@/components/landlord/KPICard'
import type { PagosHomeMetrics } from '@/lib/api/pagos-home.types'

type CountKey = Exclude<keyof PagosHomeMetrics, 'valorRecaudadoCop' | 'valorPendienteLiquidarCop'>

type KpiVariant = 'default' | 'primary' | 'warning' | 'success' | 'info'

const COUNT_TILES: ReadonlyArray<{ key: CountKey; icon: Icon; variant: KpiVariant }> = [
  { key: 'cobrosProgramados', icon: CalendarCheck, variant: 'default' },
  { key: 'cobrosEnviados', icon: PaperPlaneTilt, variant: 'info' },
  { key: 'pagosRecibidos', icon: CheckCircle, variant: 'success' },
  { key: 'linksPendientes', icon: LinkSimple, variant: 'default' },
  { key: 'pagosFallidos', icon: XCircle, variant: 'warning' },
  { key: 'propietariosListos', icon: UserCheck, variant: 'primary' },
]

export interface PagosHomeMetricsStripProps {
  data: PagosHomeMetrics | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

export function PagosHomeMetricsStrip({
  data,
  isLoading,
  error,
  onRetry,
}: PagosHomeMetricsStripProps) {
  const { t, formatCurrency } = useI18n()

  // ── Loading skeleton (first load) ──────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <section aria-busy="true" aria-label={t('inmobiliaria.ai.pagos_home.metrics.sectionTitle')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              data-testid="metric-skeleton"
              className="rounded-sm border border-border p-5 space-y-3 animate-pulse"
            >
              <div className="h-10 w-10 rounded-sm bg-surface-muted" />
              <div className="h-8 w-24 rounded bg-surface-muted" />
              <div className="h-3 w-20 rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error && !isLoading) {
    return (
      <MetricsError message={error} onRetry={onRetry} />
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <p className="text-sm text-fg-muted">
        {t('inmobiliaria.ai.pagos_home.metrics.empty')}
      </p>
    )
  }

  return (
    <section aria-label={t('inmobiliaria.ai.pagos_home.metrics.sectionTitle')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {COUNT_TILES.map(({ key, icon, variant }) => (
          <KPICard
            key={key}
            title={t(`inmobiliaria.ai.pagos_home.metrics.${key}`)}
            value={data[key]}
            icon={icon}
            variant={variant}
          />
        ))}
        {/* COP-valued tiles render as formatted-currency text, not animated counters. */}
        <CurrencyTile
          title={t('inmobiliaria.ai.pagos_home.metrics.valorRecaudadoCop')}
          value={formatCurrency(data.valorRecaudadoCop)}
          icon={CurrencyDollar}
          accent="success"
        />
        <CurrencyTile
          title={t('inmobiliaria.ai.pagos_home.metrics.valorPendienteLiquidarCop')}
          value={formatCurrency(data.valorPendienteLiquidarCop)}
          icon={Wallet}
          accent="default"
        />
      </div>
    </section>
  )
}

// ── Currency tile (mirrors KPICard layout, text value) ────────────────────────

function CurrencyTile({
  title,
  value,
  icon: TileIcon,
  accent,
}: {
  title: string
  value: string
  icon: Icon
  accent: 'success' | 'default'
}) {
  const iconClasses =
    accent === 'success'
      ? 'bg-success-soft text-success'
      : 'bg-surface-muted text-fg-muted'
  const valueClasses = accent === 'success' ? 'text-success' : 'text-fg'

  return (
    <div className="relative p-5 rounded-sm border border-border shadow-sm bg-surface">
      <div
        className={`w-10 h-10 rounded-sm flex items-center justify-center mb-4 ${iconClasses}`}
      >
        <TileIcon className="w-5 h-5" />
      </div>
      <p className={`text-2xl font-mono font-bold tabular-nums tracking-tight ${valueClasses}`}>
        {value}
      </p>
      <p className="text-sm text-fg-muted mt-1">{title}</p>
    </div>
  )
}

// ── Error sub-component ───────────────────────────────────────────────────────

function MetricsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger bg-danger-soft p-4 flex items-center justify-between gap-4"
    >
      <p className="text-sm text-danger">
        {t('inmobiliaria.ai.pagos_home.errors.loading')}: {message}
      </p>
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onRetry}
        className="shrink-0 h-auto px-0 text-xs font-medium text-danger underline hover:no-underline"
      >
        {t('inmobiliaria.ai.pagos_home.errors.retry')}
      </Button>
    </div>
  )
}
