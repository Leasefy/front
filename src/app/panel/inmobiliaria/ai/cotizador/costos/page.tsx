'use client'

/**
 * costos/page.tsx — Phase 35 plan 35-10 (COTI-UI-09)
 *
 * Cost dashboard for agency owners/admins.
 * Exposes: cost-per-quote KPI, monthly burn, 30-day forecast, cost-by-source pie,
 * monthly trend chart, and a per-source breakdown table.
 *
 * Permissions: cotizador layout (Phase 29) wraps this route with PageGuard.
 * This page does NOT re-check permissions.
 *
 * Polling:
 *   - KPI strip: 30s (via useCostos → fetchSummary)
 *   - Charts: 60s (via useCostos → fetchSeries)
 */

import { useI18n } from '@/lib/i18n'
import { useCostos } from '@/lib/hooks/cotizador/use-costos'
import { CostKpiStrip } from '@/components/inmobiliaria/cotizador/CostKpiStrip'
import { CostSourcePieChart } from '@/components/inmobiliaria/cotizador/CostSourcePieChart'
import { MonthlyCostTrendChart } from '@/components/inmobiliaria/cotizador/MonthlyCostTrendChart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'

export default function CostosPage() {
  const { t } = useI18n()
  const {
    summaryData,
    seriesData,
    isLoadingSummary,
    isLoadingSeries,
    summaryError,
    seriesError,
    refetchSummary,
    refetchSeries,
  } = useCostos()

  // Phase 38-05b: page-level skeleton on initial load only (D-38-04: skeleton only;
  // per-section table skeleton + inline empty prose preserved below; no EmptyState since
  // costos uses Phase 35 SampleDataWatermark semantics — no "truly nothing" zero state).
  if (isLoadingSummary && !summaryData) return <PageSkeleton variant="dashboard" />

  // Derive table rows by joining costSources registry labels with source totals
  const tableRows = (summaryData?.costSources ?? []).map(src => ({
    key: src.key,
    label: src.label,
    populated: src.populated,
    // Backend sends totals keyed as anthropicTotal, carrierApiTotal, etc.
    // parseFloat() guards against string values (backend may return strings per plan spec)
    total: parseFloat(
      String(
        summaryData?.sources[`${src.key.replace(/_([a-z])/g, (_m: string, l: string) => l.toUpperCase())}Total` as keyof typeof summaryData.sources] ?? 0
      )
    ),
  }))

  return (
    <main className="p-6 lg:p-8 space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
          {t('inmobiliaria.ai.cotizador.costos.pageTitle')}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {t('inmobiliaria.ai.cotizador.costos.pageSubtitle')}
        </p>
      </div>

      {/* KPI strip — 30s polling (separate from charts per D-35-08) */}
      <CostKpiStrip kpis={summaryData?.kpis ?? null} isLoading={isLoadingSummary} />

      {/* Main charts row: pie (left) + trend line (right) — side-by-side on md+ (D-35-09 / XR-03) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
            {t('inmobiliaria.ai.cotizador.costos.charts.costSourcePie.title')}
          </h2>
          <CostSourcePieChart
            sources={summaryData?.sources ?? null}
            costSources={summaryData?.costSources ?? []}
            isLoading={isLoadingSummary}
          />
        </section>

        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
            {t('inmobiliaria.ai.cotizador.costos.charts.monthlyCostTrend.title')}
          </h2>
          <MonthlyCostTrendChart
            rows={(seriesData?.rows ?? []).map(r => ({
              period: r.period,
              // parseFloat() guard — backend may return cost values as strings
              total: parseFloat(String(r.total)),
              isForecast: r.isForecast,
            }))}
            isLoading={isLoadingSeries}
          />
        </section>
      </div>

      {/* Per-source breakdown table */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.ai.cotizador.costos.sourceBreakdownTitle')}
          </h2>
        </div>
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colSource')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-right">
                {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colTotal')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colStatus')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {tableRows.map(row => (
              <tr key={row.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                  {row.label}
                </td>
                <td className="px-4 py-3 text-sm font-mono tabular-nums text-right text-neutral-900 dark:text-neutral-100">
                  {row.total > 0 ? `$${row.total.toFixed(4)}` : '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {row.populated ? (
                    <Badge variant="outline" className="text-[#2C7A53] border-[#2C7A53]/30">
                      {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.statusPopulated')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-neutral-400">
                      {t('inmobiliaria.ai.cotizador.costos.sourceBreakdown.statusEmpty')}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Loading skeleton for table when no data yet */}
        {(isLoadingSummary || isLoadingSeries) && tableRows.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="h-4 w-48 mx-auto rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          </div>
        )}

        {/* Empty state when loaded but no cost sources */}
        {!isLoadingSummary && tableRows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-neutral-500">
            {t('inmobiliaria.ai.cotizador.costos.noCostSources')}
          </div>
        )}
      </section>

      {/* Error state */}
      {(summaryError || seriesError) && (
        <div className="rounded-md bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D] px-4 py-3 text-sm flex items-center justify-between">
          <span>{t('inmobiliaria.ai.cotizador.costos.loadError')}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void refetchSummary()
              void refetchSeries()
            }}
          >
            {t('inmobiliaria.ai.cotizador.costos.retry')}
          </Button>
        </div>
      )}
    </main>
  )
}
