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
import { Button } from '@/components/ui/button'

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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href=".."
              className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {carrier.toUpperCase()}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.title')} — {carrier.toUpperCase()}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          hideArrow
          onClick={() => void refetch()}
          aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.carrier.refresh')}
        >
          <ArrowClockwise className="h-4 w-4" />
        </Button>
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
