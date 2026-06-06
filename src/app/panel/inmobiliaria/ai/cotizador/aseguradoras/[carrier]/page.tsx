'use client'

/**
 * aseguradoras/[carrier]/page.tsx — Phase 35 plan 35-08 (Task 3)
 *
 * Per-carrier deep-dive page: KPI strip + latency sparkline + error rate chart +
 * approval by canon chart + last-50 quotes table.
 *
 * Permissions: handled by cotizador layout (Phase 29). No re-check here.
 * Route params: accessed via useParams() — required for 'use client' pages.
 */

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowClockwise } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useCarrierDetail } from '@/lib/hooks/cotizador/use-carrier-detail'
import { useCarrierRecentQuotes } from '@/lib/hooks/cotizador/use-carrier-recent-quotes'
import { CarrierDeepDiveKpiStrip } from '@/components/inmobiliaria/cotizador/CarrierDeepDiveKpiStrip'
import { CarrierLatencySparkline } from '@/components/inmobiliaria/cotizador/CarrierLatencySparkline'
import { CarrierErrorRateChart } from '@/components/inmobiliaria/cotizador/CarrierErrorRateChart'
import { CarrierApprovalByCanonChart } from '@/components/inmobiliaria/cotizador/CarrierApprovalByCanonChart'
import { CarrierRecentQuotesTable } from '@/components/inmobiliaria/cotizador/CarrierRecentQuotesTable'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'

// =============================================================================
// Component
// =============================================================================

export default function CarrierDeepDivePage() {
  const { t } = useI18n()
  const params = useParams()
  const carrier = params.carrier as string

  const { data: detail, isLoading, error, refetch } = useCarrierDetail(carrier)
  const { data: recentQuotes, isLoading: quotesLoading } = useCarrierRecentQuotes(carrier)

  // Phase 38-05b: skeleton only (D-38-04: dynamic detail route, no EmptyState).
  if (isLoading && !detail) return <PageSkeleton variant="detail" />

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/panel/inmobiliaria/ai/cotizador/aseguradoras"
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('inmobiliaria.ai.cotizador.aseguradoras.backToList')}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {carrier.toUpperCase()}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Ver SLA link — outlined, not primary CTA */}
          <Link
            href="./sla"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.slaLinkLabel')}
          </Link>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.carrier.refresh')}
          >
            <ArrowClockwise className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.errorLoading')}: {error}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs text-rose-600 dark:text-rose-400 underline hover:no-underline flex-shrink-0"
          >
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.retry')}
          </button>
        </div>
      )}

      {/* KPI strip */}
      <CarrierDeepDiveKpiStrip kpis={detail?.kpis ?? null} isLoading={isLoading} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Latency sparkline */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 mb-3">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.latency.title')}
          </p>
          <CarrierLatencySparkline data={detail?.latencySparkline ?? []} isLoading={isLoading} />
        </div>

        {/* Error rate chart */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 mb-3">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.errorRate.title')}
          </p>
          <CarrierErrorRateChart data={detail?.errorRateSeries ?? []} isLoading={isLoading} />
        </div>
      </div>

      {/* Approval by canon — full width */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 mb-3">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.approvalByCanon.title')}
        </p>
        <CarrierApprovalByCanonChart data={detail?.approvalByCanon ?? []} isLoading={isLoading} />
      </div>

      {/* Recent quotes table — full width */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-wide text-neutral-500 mb-3">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.title')}
        </h2>
        <CarrierRecentQuotesTable quotes={recentQuotes ?? null} isLoading={quotesLoading} />
      </section>
    </main>
  )
}
