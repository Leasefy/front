'use client'

/**
 * aseguradoras/[carrier]/sla/page.tsx — Phase 35 plan 35-08 (Task 3)
 *
 * SLA sub-page: state card (emerald/amber/rose) + 30d sparklines + breach windows table.
 *
 * Permissions: handled by cotizador layout (Phase 29). No re-check here.
 * Route params: accessed via useParams() — required for 'use client' pages.
 */

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowClockwise, ChartLine } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useCarrierSla } from '@/lib/hooks/cotizador/use-carrier-sla'
import { CarrierSlaStateCard } from '@/components/inmobiliaria/cotizador/CarrierSlaStateCard'
import { CarrierSlaBreachWindows } from '@/components/inmobiliaria/cotizador/CarrierSlaBreachWindows'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'

// =============================================================================
// Component
// =============================================================================

export default function CarrierSlaPage() {
  const { t } = useI18n()
  const params = useParams()
  const carrier = params.carrier as string

  const { data: sla, isLoading, error, refetch } = useCarrierSla(carrier)

  // Phase 38-05b: skeleton + EmptyState early returns (D-38-04: SLA sub-page gets both, no CTA).
  // i18n note: using existing `aseguradoras.sla.empty.*` keys scaffolded by 38-02 (verbatim D-38-04 copy);
  // the plan's literal `aseguradoras.carrier.sla.empty.*` path was a parallel namespace not wired in i18n
  // — reusing already-scaffolded keys avoids adding orphan strings under an unwired `carrier` namespace.
  if (isLoading && !sla) return <PageSkeleton variant="list" />
  if (
    !isLoading &&
    (!sla || (!sla.state && (!sla.breachWindows || sla.breachWindows.length === 0)))
  ) {
    return (
      <EmptyState
        icon={ChartLine}
        title={t('inmobiliaria.ai.cotizador.aseguradoras.sla.empty.title')}
        description={t('inmobiliaria.ai.cotizador.aseguradoras.sla.empty.description')}
      />
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href=".."
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {carrier.toUpperCase()}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.title')} — {carrier.toUpperCase()}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
          aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.carrier.refresh')}
        >
          <ArrowClockwise className="h-4 w-4" />
        </button>
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

      {/* SLA state card with sparklines */}
      <CarrierSlaStateCard
        state={sla?.state ?? null}
        since={sla?.since ?? null}
        reason={sla?.reason ?? null}
        p95Sparkline={sla?.p95Sparkline ?? []}
        errorRateSparkline={sla?.errorRateSparkline ?? []}
        isLoading={isLoading}
      />

      {/* Breach windows table */}
      <CarrierSlaBreachWindows
        breachWindows={sla?.breachWindows ?? null}
        isLoading={isLoading}
      />
    </main>
  )
}
