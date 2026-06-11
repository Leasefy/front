'use client'

import * as React from 'react'
import { useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChatCircleText,
  ClipboardText,
  CreditCard,
  FileArrowUp,
  FolderOpen,
  UsersThree,
  Warning,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useCarteraOverview } from '@/lib/hooks/cobranza/use-cartera-overview'
import { useStageTransitionsRealtime } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import type { StageTransitionEvent } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import { CobranzaKpiStrip } from '@/components/inmobiliaria/cobranza/CobranzaKpiStrip'
import { CobranzaStageCard } from '@/components/inmobiliaria/cobranza/CobranzaStageCard'
import { CobranzaFunnelChart } from '@/components/inmobiliaria/cobranza/CobranzaFunnelChart'
import { CobranzaTransitionsFeed } from '@/components/inmobiliaria/cobranza/CobranzaTransitionsFeed'
import { CobranzaNextActionsPanel } from '@/components/inmobiliaria/cobranza/CobranzaNextActionsPanel'
import { CobranzaOverviewSkeleton } from '@/components/skeleton/panel/CobranzaOverviewSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { CARTERA_STAGES, relativeTime } from '@/lib/cartera'
import type { CarteraStage } from '@/lib/cartera'

// PermissionsContext has no tenantId field — backend derives tenant from JWT.
// Pass empty string; Supabase Realtime will silently not connect until tenant is available.
const TENANT_PLACEHOLDER = ''

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.cobranza'

/** "¿Cómo funciona?" — el viaje de la cobranza en 4 pasos (patrón avalúos). */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: ClipboardText, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: ChatCircleText, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: CreditCard, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
  { icon: UsersThree, titleKey: `${PAGES_NS}.comoFunciona.step4.title`, descKey: `${PAGES_NS}.comoFunciona.step4.desc` },
]

export default function CobranzaOverviewPage() {
  const { t, locale } = useI18n()
  const router = useRouter()

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

  // Stage click — drill into /deudores, which prefills its filters from ?stage=
  // (DeudoresListClient reads the querystring). Pushing ?stage= onto THIS page
  // was a no-op: nobody here reads the param.
  const handleStageClick = useCallback(
    (stage: CarteraStage) => {
      router.push(`/panel/inmobiliaria/ai/cobranza/deudores?stage=${stage}`)
    },
    [router]
  )

  // ── Roving-tabindex composite-widget pattern (Phase 38 plan 38-04c / D-38-13) ─
  // The 7 stage cards act as a tablist; Tab enters once, ArrowLeft/Right moves
  // focus within. Enter/Space activates the same handler as a mouse click.
  const [focusedStage, setFocusedStage] = useState<CarteraStage>('S0')

  // One ref per stage — stable across renders (createRef runs once on mount).
  const stageRefs = useRef<Record<CarteraStage, React.RefObject<HTMLButtonElement>>>(
    Object.fromEntries(
      CARTERA_STAGES.map((s) => [s, React.createRef<HTMLButtonElement>()]),
    ) as Record<CarteraStage, React.RefObject<HTMLButtonElement>>,
  )

  const handleStageKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, stage: CarteraStage) => {
      const idx = CARTERA_STAGES.indexOf(stage)
      if (e.key === 'ArrowRight' && idx < CARTERA_STAGES.length - 1) {
        e.preventDefault()
        const next = CARTERA_STAGES[idx + 1]
        setFocusedStage(next)
        stageRefs.current[next].current?.focus()
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault()
        const prev = CARTERA_STAGES[idx - 1]
        setFocusedStage(prev)
        stageRefs.current[prev].current?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        const first = CARTERA_STAGES[0]
        setFocusedStage(first)
        stageRefs.current[first].current?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        const last = CARTERA_STAGES[CARTERA_STAGES.length - 1]
        setFocusedStage(last)
        stageRefs.current[last].current?.focus()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleStageClick(stage)
      }
    },
    [handleStageClick],
  )

  // ── Skeleton + EmptyState guards (Phase 38 plan 38-04a / D-38-04) ─────────
  if (isLoading && !data) return <CobranzaOverviewSkeleton />

  if (!data && !isLoading && !error) {
    return (
      <main className="p-6 lg:p-8 space-y-4">
        <EmptyState
          icon={FolderOpen}
          title={t('inmobiliaria.ai.cobranza.overview.empty.title')}
          description={t('inmobiliaria.ai.cobranza.overview.empty.description')}
        />
        {/* Importar cartera — visible pero aún sin importador real (patrón avalúos):
            el importador de /portafolio/importar solo carga propiedades, así que
            la acción degrada a "próximamente" en vez de mentir con un link. */}
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              <FileArrowUp className="w-5 h-5 text-neutral-600 dark:text-neutral-300" weight="duotone" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {t('inmobiliaria.ai.cobranza.overview.empty.cta.label')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(`${PAGES_NS}.importarNota`)}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center px-4 py-2 rounded-full bg-muted text-muted-foreground text-xs font-mono uppercase tracking-wide">
              {t(`${PAGES_NS}.importarProximamente`)}
            </span>
          </div>
        </div>
      </main>
    )
  }

  // Live-region announcement string for new realtime stage transitions
  // (Phase 38 plan 38-04c / XR-06 / WCAG 4.1.3). String is i18n-translated;
  // raw event payloads (debtor PII) never reach this region.
  const transitionAnnouncement =
    realtimeTransitions.length > 0
      ? t('inmobiliaria.ai.cobranza.overview.liveRegion.newTransition', {
          count: realtimeTransitions.length,
        })
      : ''

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* ARIA live region — announces new stage transitions to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {transitionAnnouncement}
      </div>

      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {/* ← + miga de pan: volver al hub de agentes (patrón MigaDePan) */}
          <MigaDePan
            backHref="/panel/inmobiliaria/ai"
            icon={ChatCircleText}
            className="mb-2"
            crumbs={[
              { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
              { label: t('inmobiliaria.ai.cobranza.overview.title') },
            ]}
          />
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.overview.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t(`${PAGES_NS}.salaDesc`)}
          </p>
        </div>
        {data?.generatedAt && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap mt-1 flex items-center gap-2">
            {t('inmobiliaria.ai.cobranza.overview.lastUpdated')}{' '}
            {relativeTime(data.generatedAt, locale)}
            {isConnected && (
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full bg-[#2C7A53] animate-ping"
                aria-hidden="true"
              />
            )}
          </p>
        )}
      </header>

      {/* Acción principal + ¿Cómo funciona? — patrón avalúos (card + 4 pasos) */}
      <section className="space-y-4" data-testid="cobranza-accion">
        {/* Acción principal — revisar escalaciones pendientes */}
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              <Warning className="w-5 h-5 text-neutral-600 dark:text-neutral-300" weight="duotone" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {t(`${PAGES_NS}.accionTitle`)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(`${PAGES_NS}.accionDesc`)}
              </p>
            </div>
            <Link
              href="/panel/inmobiliaria/ai/cobranza/escalaciones"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition"
              data-testid="cobranza-accion-cta"
            >
              {t('inmobiliaria.ai.nav.escalaciones')}
              {(data?.kpis.escalacionesPendientes ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-xs font-semibold">
                  {data?.kpis.escalacionesPendientes}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Cómo funciona — el viaje de la cobranza en 4 pasos */}
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl space-y-4" data-testid="cobranza-como-funciona">
          <h2 className="text-sm font-semibold text-foreground">
            {t(`${PAGES_NS}.comoFunciona.title`)}
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMO_FUNCIONA_STEPS.map((step, i) => {
              const StepIcon = step.icon
              return (
                <li key={step.titleKey} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <StepIcon className="w-4 h-4 text-foreground" weight="duotone" aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">{i + 1}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-foreground leading-tight">
                    {t(step.titleKey)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{t(step.descKey)}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* KPI Strip */}
      <CobranzaKpiStrip
        deudoresActivos={data?.kpis.deudoresActivos ?? 0}
        pagadoHoyCop={data?.kpis.pagadoHoyCop ?? 0}
        llamadasHoy={data?.kpis.llamadasHoy ?? 0}
        escalacionesPendientes={data?.kpis.escalacionesPendientes ?? 0}
        isLoading={isLoading}
      />

      {/* Stage cards — roving-tabindex tablist composite widget (D-38-13) */}
      <section
        role="tablist"
        aria-label={t('inmobiliaria.ai.cobranza.overview.stages.title')}
        aria-orientation="horizontal"
      >
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
          {t('inmobiliaria.ai.cobranza.overview.stages.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {CARTERA_STAGES.map((stage) => {
            const stageData = data?.stages.find((s) => s.stage === stage)
            return (
              <CobranzaStageCard
                key={stage}
                ref={stageRefs.current[stage]}
                stage={stage}
                count={stageData?.count ?? 0}
                avgDaysInStage={stageData?.avgDaysInStage ?? 0}
                weeklyDelta={stageData?.weeklyDelta ?? 0}
                onStageClick={handleStageClick}
                isLoading={isLoading}
                role="tab"
                aria-selected={focusedStage === stage}
                tabIndex={focusedStage === stage ? 0 : -1}
                id={`stage-tab-${stage}`}
                aria-controls="stage-panel"
                onKeyDown={(e) => handleStageKeyDown(e, stage)}
              />
            )
          })}
        </div>
      </section>

      {/* Tabpanel — required by ARIA spec when role=tab + aria-controls present */}
      <section
        role="tabpanel"
        id="stage-panel"
        aria-labelledby={`stage-tab-${focusedStage}`}
        className="space-y-6"
      >
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
          <div className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-4 text-sm text-[#C4503B] dark:text-[#E0664D]">
            {t('inmobiliaria.ai.cobranza.overview.errorLoading')}: {error}
          </div>
        )}
      </section>
    </main>
  )
}
