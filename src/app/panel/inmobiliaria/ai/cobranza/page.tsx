'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useCarteraOverview } from '@/lib/hooks/cobranza/use-cartera-overview'
import { useStageTransitionsRealtime } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import type { StageTransitionEvent } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import { CobranzaKpiStrip } from '@/components/inmobiliaria/cobranza/CobranzaKpiStrip'
import { CobranzaStageCard } from '@/components/inmobiliaria/cobranza/CobranzaStageCard'
import { CobranzaFunnelChart } from '@/components/inmobiliaria/cobranza/CobranzaFunnelChart'
import { CobranzaTransitionsFeed } from '@/components/inmobiliaria/cobranza/CobranzaTransitionsFeed'
import { CobranzaNextActionsPanel } from '@/components/inmobiliaria/cobranza/CobranzaNextActionsPanel'
import { CARTERA_STAGES, relativeTime } from '@/lib/cartera'
import type { CarteraStage } from '@/lib/cartera'

// PermissionsContext has no tenantId field — backend derives tenant from JWT.
// Pass empty string; Supabase Realtime will silently not connect until tenant is available.
const TENANT_PLACEHOLDER = ''

export default function CobranzaOverviewPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Data hook
  const { data, isLoading, error } = useCarteraOverview()

  // Local state for realtime-prepended transitions
  const [realtimeTransitions, setRealtimeTransitions] = useState<StageTransitionEvent[]>([])

  const handleNewTransition = useCallback((transition: StageTransitionEvent) => {
    setRealtimeTransitions((prev) => [transition, ...prev].slice(0, 25))
  }, [])

  // Realtime subscription
  const { isConnected } = useStageTransitionsRealtime({
    tenantId: TENANT_PLACEHOLDER,
    onNewTransition: handleNewTransition,
  })

  // Merge realtime + endpoint transitions, dedup by id
  const transitions = useMemo(() => {
    const endpointTransitions = data?.lastTransitions ?? []
    const merged = [...realtimeTransitions, ...endpointTransitions]
    const seen = new Set<string>()
    return merged
      .filter((item) => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
      .slice(0, 25)
  }, [realtimeTransitions, data?.lastTransitions])

  // Stage click — update URL query param (Phase 31 builds the drill destination)
  const handleStageClick = useCallback(
    (stage: CarteraStage) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('stage', stage)
      router.push(`/panel/inmobiliaria/ai/cobranza?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.overview.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t('inmobiliaria.ai.cobranza.overview.subtitle')}
          </p>
        </div>
        {data?.generatedAt && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap mt-1 flex items-center gap-2">
            {t('inmobiliaria.ai.cobranza.overview.lastUpdated')}{' '}
            {relativeTime(data.generatedAt, locale)}
            {isConnected && (
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"
                aria-hidden="true"
              />
            )}
          </p>
        )}
      </header>

      {/* KPI Strip */}
      <CobranzaKpiStrip
        deudoresActivos={data?.kpis.deudoresActivos ?? 0}
        pagadoHoyCop={data?.kpis.pagadoHoyCop ?? 0}
        llamadasHoy={data?.kpis.llamadasHoy ?? 0}
        escalacionesPendientes={data?.kpis.escalacionesPendientes ?? 0}
        isLoading={isLoading}
      />

      {/* Stage cards */}
      <section aria-label={t('inmobiliaria.ai.cobranza.overview.stages.title')}>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
          {t('inmobiliaria.ai.cobranza.overview.stages.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {CARTERA_STAGES.map((stage) => {
            const stageData = data?.stages.find((s) => s.stage === stage)
            return (
              <CobranzaStageCard
                key={stage}
                stage={stage}
                count={stageData?.count ?? 0}
                avgDaysInStage={stageData?.avgDaysInStage ?? 0}
                weeklyDelta={stageData?.weeklyDelta ?? 0}
                onStageClick={handleStageClick}
                isLoading={isLoading}
              />
            )
          })}
        </div>
      </section>

      {/* Funnel chart */}
      <section aria-label={t('inmobiliaria.ai.cobranza.overview.funnel.title')}>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
          {t('inmobiliaria.ai.cobranza.overview.funnel.title')}
        </h2>
        <CobranzaFunnelChart
          stages={data?.stages.map((s) => ({ stage: s.stage, count: s.count })) ?? []}
          isLoading={isLoading}
        />
      </section>

      {/* Two-column section: transitions (60%) + next actions (40%) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* On sm: next actions accordion renders above feed */}
        <div className="md:hidden">
          <CobranzaNextActionsPanel
            actions={data?.nextActions ?? []}
            isLoading={isLoading}
          />
        </div>

        {/* Transitions feed — 3/5 = 60% */}
        <div className="md:col-span-3">
          <CobranzaTransitionsFeed
            transitions={transitions}
            isLoading={isLoading}
          />
        </div>

        {/* Next actions panel — 2/5 = 40% (hidden on sm, accordion shows above) */}
        <div className="hidden md:block md:col-span-2">
          <CobranzaNextActionsPanel
            actions={data?.nextActions ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
          {t('inmobiliaria.ai.cobranza.overview.errorLoading')}: {error}
        </div>
      )}
    </main>
  )
}
