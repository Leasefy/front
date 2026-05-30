'use client'

// Permissions gate: cobranza:view enforced by layout.tsx via NavItemWithModule module='cobranza'.
// Page does not re-check.

import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { SampleDataWatermark } from '@/components/data-display/SampleDataWatermark'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { STUB_RECOVERY_RATE } from '@/lib/fixtures/cobranza-analytics-stub'

// TODO(37-08): replace with real hook from @/lib/hooks/cobranza/use-cobranza-analytics
const useCobranzaAnalytics = () => ({
  isLoading: false as const,
  error: null as string | null,
  // data shape will be expanded in 37-08; agencyGate is the minimal surface needed here
  data: null as null | { agencyGate?: { populated: boolean } },
})

export default function CobranzaAnaliticaPage() {
  const { t } = useI18n()
  const { isLoading, error, data } = useCobranzaAnalytics()

  const isAgencyGateClosed =
    !isLoading && data?.agencyGate?.populated === false

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

      {/* Error banner */}
      {error && !isLoading && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {t('inmobiliaria.ai.cobranza.analitica.errors.loading')}: {error}
          </p>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-rose-600 dark:text-rose-400 underline hover:no-underline"
          >
            {t('inmobiliaria.ai.cobranza.analitica.errors.retry')}
          </button>
        </div>
      )}

      {/* Agency-gate empty state (D-37-05): requires ≥5 calls in 30d */}
      {isAgencyGateClosed && (
        <NoDataYetBadge
          phase={37}
          reason={t('inmobiliaria.ai.cobranza.analitica.agencyGate.reason')}
          cta={t('inmobiliaria.ai.cobranza.analitica.agencyGate.ctaLabel')}
          ctaHref="/panel/inmobiliaria/ai/cobranza"
        />
      )}

      {/* Loading skeleton (first load, no data yet) */}
      {isLoading && (
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
      )}

      {/* 5-widget grid — shown when not loading or when data is present */}
      {!isLoading && !isAgencyGateClosed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Widget 1 — Recovery Rate (full-row) */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4 md:col-span-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.recoveryRate.title')}
            </h2>
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">
              Recovery Rate Chart — coming 37-08
            </div>
          </section>

          {/* Widget 2 — Top Scripts */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
            </h2>
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">
              Top Scripts Widget — coming 37-10
            </div>
          </section>

          {/* Widget 3 — Top Objections */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
            </h2>
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">
              Top Objections Widget — coming 37-10
            </div>
          </section>

          {/* Widget 4 — Cadence Heatmap (full-row) */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4 md:col-span-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.cadence.title')}
            </h2>
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">
              Cadence Heatmap — coming 37-09
            </div>
          </section>

          {/* Widget 5 — Cost per Peso */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.title')}
            </h2>
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">
              Cost per Peso Widget — coming 37-08
            </div>
          </section>

        </div>
      )}

      {/*
        SampleDataWatermark import kept live (show=false so no visual output).
        Plans 37-08..37-10 will enable show=true on individual widget sections.
        STUB_RECOVERY_RATE import proves type contract for downstream plans.
        _stubRef is intentionally unused at runtime — it is type-checked only.
      */}
      <SampleDataWatermark show={false}>
        <div aria-hidden="true" />
      </SampleDataWatermark>
    </main>
  )
}
