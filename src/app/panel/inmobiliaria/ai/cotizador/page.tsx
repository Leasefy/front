'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus, Tray } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import {
  useCotizadorOverview,
  type CotizadorOverviewResponse,
  type QuoteInsertEvent,
} from '@/lib/hooks/cotizador/use-cotizador-overview'
import { CotizadorKpiStrip } from '@/components/inmobiliaria/cotizador/CotizadorKpiStrip'
import { CotizadorRecentQuotesFeed } from '@/components/inmobiliaria/cotizador/CotizadorRecentQuotesFeed'
import { CotizadorCarriersStatus } from '@/components/inmobiliaria/cotizador/CotizadorCarriersStatus'
import { CotizadorOverviewSkeleton } from '@/components/skeleton/panel/CotizadorOverviewSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { relativeTime } from '@/lib/cartera'

// Permissions gate is enforced by the cotizador layout (Phase 29).
// This page does NOT re-check canAccess — layout handles 403 before mount.

export default function CotizadorOverviewPage() {
  const { t, locale } = useI18n()

  const {
    data,
    isLoading,
    error,
    isRealtimeConnected,
    realtimeQuotes,
  } = useCotizadorOverview()

  // Merge realtime-prepended quotes with endpoint quotes, dedup by id
  const mergedQuotes = useMemo<CotizadorOverviewResponse['lastQuotes']>(() => {
    const endpointQuotes = data?.lastQuotes ?? []
    // Convert QuoteInsertEvent to lastQuotes shape
    const rtQuotes = realtimeQuotes.map(
      (q: QuoteInsertEvent): CotizadorOverviewResponse['lastQuotes'][0] => ({
        id: q.id,
        cedulaHashPrefix8: q.cedulaHashPrefix8,
        canonCop: q.canonCop,
        ciudad: q.ciudad,
        status: q.status,
        createdAt: q.createdAt,
        approvedCount: q.approvedCount,
        totalCarriers: q.totalCarriers,
      }),
    )
    const merged = [...rtQuotes, ...endpointQuotes]
    const seen = new Set<string>()
    return merged
      .filter((q) => {
        if (seen.has(q.id)) return false
        seen.add(q.id)
        return true
      })
      .slice(0, 10)
  }, [realtimeQuotes, data?.lastQuotes])

  // ── Skeleton + EmptyState guards (Phase 38 plan 38-04b / D-38-04) ─────────
  if (isLoading && !data) return <CotizadorOverviewSkeleton />

  if (!isLoading && !error && mergedQuotes.length === 0) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={Tray}
          title={t('inmobiliaria.ai.cotizador.overview.empty.title')}
          description={t('inmobiliaria.ai.cotizador.overview.empty.description')}
          primaryCta={{
            label: t('inmobiliaria.ai.cotizador.overview.empty.cta.label'),
            href: '/panel/inmobiliaria/ai/cotizador/nueva',
          }}
        />
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cotizador.overview.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t('inmobiliaria.ai.cotizador.overview.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {data?.generatedAt && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap flex items-center gap-2">
              {t('inmobiliaria.ai.cotizador.overview.lastUpdated')}{' '}
              {relativeTime(data.generatedAt, locale)}
              {isRealtimeConnected && (
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"
                  aria-hidden="true"
                />
              )}
            </p>
          )}
          {/* Nueva cotización CTA — per COTI-UI-01 */}
          <Link
            href="/panel/inmobiliaria/ai/cotizador/nueva"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
          >
            <Plus className="h-4 w-4" weight="bold" />
            {t('inmobiliaria.ai.cotizador.overview.newQuoteCta')}
          </Link>
        </div>
      </header>

      {/* KPI Strip */}
      <CotizadorKpiStrip kpis={data?.kpis ?? null} isLoading={isLoading} />

      {/* Recent Quotes Feed */}
      <section aria-label={t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
          {t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}
        </h2>
        <CotizadorRecentQuotesFeed quotes={mergedQuotes} isLoading={isLoading} />
      </section>

      {/* Carriers Status */}
      <section aria-label={t('inmobiliaria.ai.cotizador.overview.carriers.title')}>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
          {t('inmobiliaria.ai.cotizador.overview.carriers.title')}
        </h2>
        <CotizadorCarriersStatus carriers={data?.carriers ?? []} isLoading={isLoading} />
      </section>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
          {t('inmobiliaria.ai.cotizador.overview.errorLoading')}: {error}
        </div>
      )}
    </main>
  )
}
