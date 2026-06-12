'use client'

// Permissions gate: cobranza:view enforced by layout.tsx via NavItemWithModule module='cobranza'.
// Page does not re-check.

import { PhoneCall } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { EmptyState } from '@/components/data-display/EmptyState'
// SampleDataWatermark is used inside widget components (37-08, 37-09, 37-10).
import { useCobranzaAnalytics } from '@/lib/hooks/cobranza/use-cobranza-analytics'
import { RecoveryRateChart }      from '@/components/inmobiliaria/cobranza/RecoveryRateChart'
import { TopObjectionsTable }     from '@/components/inmobiliaria/cobranza/TopObjectionsTable'
import { CadenceChannelMixChart } from '@/components/inmobiliaria/cobranza/CadenceChannelMixChart'
import { HeatmapGrid24x7 }        from '@/components/inmobiliaria/cobranza/HeatmapGrid24x7'
import { CostPerPesoKpi }         from '@/components/inmobiliaria/cobranza/CostPerPesoKpi'
import { TopScriptsTable }        from '@/components/inmobiliaria/cobranza/TopScriptsTable'

export default function CobranzaAnaliticaPage() {
  const { t } = useI18n()
  const { isLoading, error, data, refetch } = useCobranzaAnalytics()

  // ── Loading skeleton (first load, no data yet) ─────────────────────────────
  if (isLoading && !data) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.analitica.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t('inmobiliaria.ai.cobranza.analitica.subtitle')}
          </p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={[
                'rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6',
                i === 0 || i === 3 ? 'md:col-span-2' : '',
              ].join(' ')}
              style={{ height: i === 0 || i === 3 ? 340 : 300 }}
            />
          ))}
        </div>
      </main>
    )
  }

  // ── Error banner (non-loading error) ──────────────────────────────────────
  if (error && !isLoading) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.analitica.title')}
          </h1>
        </header>
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {t('inmobiliaria.ai.cobranza.analitica.errors.loading')}: {error}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 text-xs font-medium text-rose-600 dark:text-rose-400 underline hover:no-underline"
          >
            {t('inmobiliaria.ai.cobranza.analitica.errors.retry')}
          </button>
        </div>
      </main>
    )
  }

  // ── Two-tier gate (D-37-05): full-page NoDataYetBadge when agency has <5 calls ──
  // Gate fires when: agencyGate.populated===false OR calls_30d<5
  // When gate fires: ONLY NoDataYetBadge is rendered — no widget grid (mutually exclusive)
  const agencyGate = data?.agencyGate
  const isAgencyGateClosed =
    !isLoading &&
    (!agencyGate?.populated || (agencyGate?.calls_30d ?? 0) < 5)

  // Phase 38-05a (D-38-04): when the agency IS populated but has zero calls in 30d,
  // surface the "truly empty" EmptyState (vs NoDataYetBadge "below threshold" branch).
  if (!isLoading && agencyGate?.populated && agencyGate?.calls_30d === 0) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.analitica.title')}
          </h1>
        </header>
        <EmptyState
          icon={PhoneCall}
          title={t('inmobiliaria.ai.cobranza.analitica.empty.title')}
          description={t('inmobiliaria.ai.cobranza.analitica.empty.description')}
          primaryCta={{ label: t('inmobiliaria.ai.cobranza.analitica.empty.cta.label'), href: '/panel/inmobiliaria/ai/cobranza/deudores' }}
        />
      </main>
    )
  }

  if (isAgencyGateClosed) {
    return (
      <main className="p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.analitica.title')}
          </h1>
        </header>
        <NoDataYetBadge
          phase={37}
          reason={t('inmobiliaria.ai.cobranza.analitica.agencyGate.reason')}
          cta={t('inmobiliaria.ai.cobranza.analitica.agencyGate.ctaLabel')}
          ctaHref="/panel/inmobiliaria/ai/cobranza"
        />
      </main>
    )
  }

  // ── Widget grid (agencyGate passed) ───────────────────────────────────────
  // maxCount for heatmap: derived from cadence.heatmap.cells
  const heatmapCells = data?.cadence?.heatmap?.cells ?? []
  const heatmapMaxCount = Math.max(1, ...heatmapCells.map((c) => c.call_count))

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {t('inmobiliaria.ai.cobranza.analitica.title')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
          {t('inmobiliaria.ai.cobranza.analitica.subtitle')}
        </p>
      </header>

      {/* 5-widget grid — XR-03: responsive cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Widget 1 — Recovery Rate (full-width row) */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4 md:col-span-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.recoveryRate.title')}
          </h2>
          <RecoveryRateChart
            data={{
              populated: data?.recovery?.populated ?? false,
              rows: data?.recovery?.rows ?? [],
              reason: data?.recovery?.reason as 'agency-gate' | 'insufficient-buckets' | undefined,
            }}
          />
        </section>

        {/* Widget 2 — Top Objections (single col) */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
          </h2>
          <TopObjectionsTable
            data={{
              populated: data?.objections?.populated ?? false,
              objections: data?.objections?.objections ?? [],
              reason: data?.objections?.reason,
            }}
          />
        </section>

        {/* Widget 3 — Cost Per Peso (single col) */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.title')}
          </h2>
          <CostPerPesoKpi
            data={(data?.costPerPeso ?? null) as any}
            isLoading={isLoading}
          />
        </section>

        {/* Widget 4 — Cadence: ChannelMix + Heatmap stacked (full-width row) */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4 md:col-span-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.cadence.title')}
          </h2>
          <div className="space-y-6">
            <CadenceChannelMixChart
              data={{
                populated: data?.cadence?.channelMix?.populated ?? false,
                rows: data?.cadence?.channelMix?.rows ?? [],
                reason: data?.cadence?.reason,
              }}
            />
            <HeatmapGrid24x7
              data={{
                populated: data?.cadence?.heatmap?.populated ?? false,
                cells: heatmapCells,
                maxCount: heatmapMaxCount,
                reason: data?.cadence?.reason,
              }}
            />
          </div>
        </section>

        {/* Widget 5 — Top Scripts (Phase 38-04a: branches on data.topScripts.populated) */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
          </h2>
          <TopScriptsTable data={data?.topScripts} />
        </section>

      </div>
    </main>
  )
}
