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
import { Button } from '@/components/ui/button'

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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/panel/inmobiliaria/ai/asegurabilidad/aseguradoras"
              className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('inmobiliaria.ai.cotizador.aseguradoras.backToList')}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {carrier.toUpperCase()}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Ver SLA link — secundaria, no primary CTA */}
          <Button variant="secondary" size="sm" hideArrow asChild>
            <Link href="./sla">
              {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.slaLinkLabel')}
            </Link>
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            hideArrow
            onClick={() => void refetch()}
            aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.carrier.refresh')}
          >
            <ArrowClockwise className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-danger">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.errorLoading')}: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => void refetch()}
            className="shrink-0"
          >
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.retry')}
          </Button>
        </div>
      )}

      {/* KPI strip */}
      <CarrierDeepDiveKpiStrip kpis={detail?.kpis ?? null} isLoading={isLoading} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Latency sparkline */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted mb-3">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.latency.title')}
          </p>
          <CarrierLatencySparkline data={detail?.latencySparkline ?? []} isLoading={isLoading} />
        </div>

        {/* Error rate chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted mb-3">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.errorRate.title')}
          </p>
          <CarrierErrorRateChart data={detail?.errorRateSeries ?? []} isLoading={isLoading} />
        </div>
      </div>

      {/* Approval by canon — full width */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted mb-3">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.charts.approvalByCanon.title')}
        </p>
        <CarrierApprovalByCanonChart data={detail?.approvalByCanon ?? []} isLoading={isLoading} />
      </div>

      {/* Recent quotes table — full width */}
      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-fg-muted mb-3">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.title')}
        </h2>
        <CarrierRecentQuotesTable quotes={recentQuotes ?? null} isLoading={quotesLoading} />
      </section>
    </main>
  )
}
