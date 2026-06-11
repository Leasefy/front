'use client'

// Permissions gate enforced by cotizador layout.tsx (Phase 29).
// This page does NOT re-check canAccess — layout handles 403 before mount.

import { useI18n } from '@/lib/i18n'
import { useInsights } from '@/lib/hooks/cotizador/use-insights'
import { ApprovalRateMonthlyChart } from '@/components/inmobiliaria/cotizador/ApprovalRateMonthlyChart'
import { PrimaDistributionChart } from '@/components/inmobiliaria/cotizador/PrimaDistributionChart'
import { InsightsAssumptionTable } from '@/components/inmobiliaria/cotizador/InsightsAssumptionTable'
import { InsightsMonthlyCostPreview } from '@/components/inmobiliaria/cotizador/InsightsMonthlyCostPreview'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'

export default function CotizadorInsightsPage() {
  const { t } = useI18n()

  const {
    approvalRateMonthly,
    primaDistribution,
    assumptions,
    monthlyCostTrend,
    isLoading,
    error,
    refetch,
  } = useInsights()

  // Phase 38-05b: PageSkeleton replaces inline animate-pulse grid (D-38-04: skeleton only;
  // per-widget SampleDataWatermark inside child components is PRESERVED; NoDataYetBadge
  // for Widgets 5+6 below is PRESERVED).
  if (isLoading && approvalRateMonthly.length === 0) return <PageSkeleton variant="dashboard" />

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {t('inmobiliaria.ai.cotizador.insights.title')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
          {t('inmobiliaria.ai.cotizador.insights.subtitle')}
        </p>
      </header>

      {/* Error banner */}
      {error && !isLoading && (
        <div className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[#C4503B] dark:text-[#E0664D]">
            {t('inmobiliaria.ai.cotizador.insights.errorLoading')}: {error}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 text-xs font-medium text-[#C4503B] dark:text-[#E0664D] underline hover:no-underline"
          >
            {t('inmobiliaria.ai.cotizador.insights.retry')}
          </button>
        </div>
      )}

      {/* 6-widget grid — shown once data arrives (even partial) */}
      {(!isLoading || approvalRateMonthly.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Widget 1 — Approval Rate Monthly (full-row at md) */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4 md:col-span-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cotizador.insights.sections.approvalRate')}
            </h2>
            <ApprovalRateMonthlyChart
              data={approvalRateMonthly.length > 0 ? approvalRateMonthly : (isLoading ? null : [])}
              isLoading={isLoading && approvalRateMonthly.length === 0}
            />
          </section>

          {/* Widget 2 — Prima Distribution */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cotizador.insights.sections.primaDistribution')}
            </h2>
            <PrimaDistributionChart
              data={primaDistribution.length > 0 ? primaDistribution : (isLoading ? null : [])}
              isLoading={isLoading && primaDistribution.length === 0}
            />
          </section>

          {/* Widget 3 — Assumption Registry Table */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cotizador.insights.sections.assumptions')}
            </h2>
            <InsightsAssumptionTable
              assumptions={assumptions.length > 0 ? assumptions : (isLoading ? null : [])}
              isLoading={isLoading && assumptions.length === 0}
            />
          </section>

          {/* Widget 4 — Monthly Cost Preview */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cotizador.insights.sections.costTrend')}
            </h2>
            <InsightsMonthlyCostPreview
              trend={monthlyCostTrend.length > 0 ? monthlyCostTrend : (isLoading ? null : [])}
              isLoading={isLoading && monthlyCostTrend.length === 0}
            />
          </section>

          {/* Widget 5 — Cohort Match Quality (NoDataYet — Phase 28) */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cotizador.insights.sections.cohortQuality')}
            </h2>
            <NoDataYetBadge
              phase={28}
              reason={t('inmobiliaria.ai.cotizador.insights.cohortQuality.reason')}
            />
          </section>

          {/* Widget 6 — Drift Report (NoDataYet — Phase 28) */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cotizador.insights.sections.driftReport')}
            </h2>
            <NoDataYetBadge
              phase={28}
              reason={t('inmobiliaria.ai.cotizador.insights.driftReport.reason')}
            />
          </section>
        </div>
      )}
    </main>
  )
}
