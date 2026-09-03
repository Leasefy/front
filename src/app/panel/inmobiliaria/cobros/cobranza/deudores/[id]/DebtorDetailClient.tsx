'use client'

/**
 * DebtorDetailClient — Phase 31 plan 31-09 (COBR-UI-03, COBR-UI-14),
 * reorganized per visión #14 (vista de caso en 3 zonas).
 *
 * Orchestrator for /panel/inmobiliaria/cobros/cobranza/deudores/[id]:
 *  - Single useDebtorDetail() call → feeds header + the 3 zones
 *  - 3 zones at lg+ (stacked below):
 *      IZQUIERDA  → DebtorSidebar (contexto: estado humano + KPIs + PII)
 *      CENTRO     → the 5 tabs (conversación e historial) — unchanged
 *      DERECHA    → DebtorActionRail (próxima acción + acciones rápidas)
 *  - useDebtorCompromisos() here feeds humanCaseState() with the open/broken
 *    promise booleans (escalated omitted — no cheap per-debtor source).
 *  - Lazy-mount tabs per D-31-09 (non-active tab unmounts, hooks idle)
 *  - PIIRevealContextProvider wraps everything; single shared PIIRevealModal
 *    lifted to this level (Task 6 wiring)
 *  - ?tab=… deep links read on mount and written on tab change (shallow)
 *  - Realtime channels (31-11) unchanged: stage_transitions + calls.
 */

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { stageColorClasses, humanCaseState } from '@/lib/cartera'
import { useDebtorDetail } from '@/lib/hooks/cobranza/use-debtor-detail'
import { useDebtorCompromisos } from '@/lib/hooks/cobranza/use-debtor-compromisos'
import { useDebtorStageTransitionsRealtime } from '@/lib/hooks/cobranza/use-debtor-stage-transitions-realtime'
import { useDebtorCallsRealtime } from '@/lib/hooks/cobranza/use-debtor-calls-realtime'
import {
  PIIRevealContextProvider,
  type PIIFieldKey,
} from '@/lib/context/PIIRevealContext'
import { PIIRevealModal } from '@/components/inmobiliaria/cobranza/PIIRevealModal'
import { Button, Badge } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MonoLabel } from '@leasefy/cadence'
// El Sheet va por el adaptador local, no crudo del DS: es lo que trae el
// overlay z-[300], el contrato de Lenis y la ✕ del producto. Importado
// directo, este cajón era el único con la ✕ pelada del DS.
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'
import { DebtorSidebar } from './DebtorSidebar'
import { DebtorActionRail } from './DebtorActionRail'
import { TimelineTab } from './tabs/TimelineTab'
import { LlamadasTab } from './tabs/LlamadasTab'
import { MemosTab } from './tabs/MemosTab'
import { CompromisosTab } from './tabs/CompromisosTab'
import { AccionesTab } from './tabs/AccionesTab'
import { CobranzaDeudorDetailSkeleton } from '@/components/skeleton/panel/CobranzaDeudorDetailSkeleton'

void React

type TabKey = 'timeline' | 'llamadas' | 'memos' | 'compromisos' | 'acciones'
const TAB_KEYS: TabKey[] = ['timeline', 'llamadas', 'memos', 'compromisos', 'acciones']

/** Payment-plan statuses that count as an OPEN promise (agent state machine:
 * offered → accepted → active; defaulted = broken). */
const OPEN_PLAN_STATUSES = new Set(['offered', 'accepted', 'active'])

function isTabKey(s: string | null): s is TabKey {
  return s !== null && (TAB_KEYS as string[]).includes(s)
}

function daysBadgeClasses(days: number): string {
  if (days <= 3) {
    return 'bg-success-soft text-success ring-1 ring-success/30'
  }
  if (days <= 7) {
    return 'bg-warning-soft text-warning ring-1 ring-warning/30'
  }
  return 'bg-danger-soft text-danger ring-1 ring-danger/30'
}

interface DebtorDetailClientProps {
  debtorId: string
}

export default function DebtorDetailClient({ debtorId }: DebtorDetailClientProps) {
  return (
    // Provider must remount cleanly when debtorId changes — React keying.
    <PIIRevealContextProvider key={debtorId} debtorId={debtorId}>
      <DebtorDetailInner debtorId={debtorId} />
    </PIIRevealContextProvider>
  )
}

function DebtorDetailInner({ debtorId }: DebtorDetailClientProps) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialTab: TabKey = isTabKey(searchParams.get('tab'))
    ? (searchParams.get('tab') as TabKey)
    : 'timeline'

  const [activeTab, setTab] = useState<TabKey>(initialTab)
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState<boolean>(false)

  // Single shared PII reveal modal — driven by lifted state (Task 6).
  const [revealModal, setRevealModal] = useState<{ field: PIIFieldKey } | null>(null)

  const { data, isLoading, error, refetch } = useDebtorDetail({ debtorId })
  const debtorName = data?.fullName ?? ''

  // Compromisos feed the human case state (open/broken promise booleans).
  // The Compromisos tab keeps its own lazy-mounted hook instance (D-31-09).
  const { data: compromisosData } = useDebtorCompromisos({ debtorId })

  const caseStateKey = useMemo(() => {
    if (!data) return null
    const plans = compromisosData?.paymentPlans ?? []
    return humanCaseState({
      stage: data.currentStage,
      isPaused: data.isPaused,
      hasOpenPromise: plans.some((p) => OPEN_PLAN_STATUSES.has(p.status)),
      hasBrokenPromise: plans.some((p) => p.status === 'defaulted'),
      // escalated: omitted — the detail response carries no per-debtor
      // escalation flag and fetching the agency-wide list here is not cheap.
    })
  }, [data, compromisosData])

  // -----------------------------------------------------------------------
  // Phase 31 plan 31-11: Supabase Realtime (XR-01, D-31-16, D-31-18)
  //
  // Two channels per open debtor (stage_transitions + calls). On each event,
  // we bump a per-tab refetchKey so the tab's data hook re-fetches (D-31-09
  // lazy-mount preserved — non-active tab still doesn't poll, just gets a
  // stale key it ignores until activated). On every SUBSCRIBED status
  // (initial + reconnect) we trigger a single detail refetch to catch any
  // events missed during a transient disconnect (lossy OK per D-31-18).
  //
  // Callbacks wrapped in useCallback so the realtime useEffect deps stay
  // referentially stable — otherwise the channel would resubscribe on every
  // parent render.
  // -----------------------------------------------------------------------
  const [timelineRefetchKey, setTimelineRefetchKey] = useState(0)
  const [callsRefetchKey, setCallsRefetchKey] = useState(0)

  const handleNewTransition = useCallback(() => {
    // Sidebar (stage badge, days-in-stage, isPaused) reads from useDebtorDetail
    // — refetch it. Timeline tab also needs to re-load.
    void refetch()
    setTimelineRefetchKey((n) => n + 1)
  }, [refetch])

  const handleStageReconnect = useCallback(() => {
    void refetch()
    setTimelineRefetchKey((n) => n + 1)
  }, [refetch])

  const handleNewCall = useCallback(() => {
    // Sidebar (contact-attempts counter) reads from useDebtorDetail — refetch.
    // Llamadas tab refetches via its own refetchKey.
    void refetch()
    setCallsRefetchKey((n) => n + 1)
  }, [refetch])

  const handleCallReconnect = useCallback(() => {
    void refetch()
    setCallsRefetchKey((n) => n + 1)
  }, [refetch])

  useDebtorStageTransitionsRealtime({
    debtorId,
    onNewTransition: handleNewTransition,
    onReconnect: handleStageReconnect,
  })
  useDebtorCallsRealtime({
    debtorId,
    onNewCall: handleNewCall,
    onReconnect: handleCallReconnect,
  })

  const onRevealRequest = useCallback((field: PIIFieldKey) => {
    setRevealModal({ field })
  }, [])

  const onIntervention = useCallback(() => {
    void refetch()
  }, [refetch])

  // Write back ?tab=… on tab change (shallow).
  const onTabChange = useCallback(
    (tab: TabKey) => {
      setTab(tab)
      setTabSwitcherOpen(false)
      const qs = new URLSearchParams(searchParams.toString())
      qs.set('tab', tab)
      router.replace(`?${qs.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  useEffect(() => {
    // Re-sync if URL changes externally.
    const fromUrl = searchParams.get('tab')
    if (isTabKey(fromUrl) && fromUrl !== activeTab) setTab(fromUrl)
  }, [searchParams, activeTab])

  const stageColors = useMemo(
    () => (data ? stageColorClasses(data.currentStage) : null),
    [data],
  )

  // ── Skeleton guard (Phase 38 plan 38-04a / D-38-04) ───────────────────────
  // Detail/dynamic routes get a skeleton only — no page-level EmptyState (404
  // path handles not-found per D-38-04 rule for detail/dynamic routes).
  if (isLoading && !data) return <CobranzaDeudorDetailSkeleton />

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <header className="mb-5">
        <VolverALaLista
          href="/panel/inmobiliaria/cobros/cobranza/deudores"
          label={t('inmobiliaria.ai.volverA.casos')}
          className="mb-2"
        />
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            {debtorName || t('inmobiliaria.ai.cobranza.detail.title')}
          </h1>
          <div className="flex items-center gap-2">
            {data && stageColors && (
              <span
                className={
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                  stageColors.bg +
                  ' ' +
                  stageColors.text +
                  ' ' +
                  stageColors.border +
                  ' border'
                }
              >
                {t('inmobiliaria.ai.cobranza.detail.header.stage')}: {data.currentStage}
              </span>
            )}
            {data && (
              <span
                className={
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                  daysBadgeClasses(data.daysInStage)
                }
              >
                {data.daysInStage} d
              </span>
            )}
            {data?.isPaused && (
              <Badge variant="warning">
                {t('inmobiliaria.ai.cobranza.detail.header.paused')}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger-soft p-4 mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-danger">
            {t('inmobiliaria.ai.cobranza.detail.error')}: {error}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            hideArrow
          >
            {t('inmobiliaria.ai.cobranza.detail.errorRetry')}
          </Button>
        </div>
      )}

      {/* 3 zonas — lg+: contexto | conversación | recomendación; below lg the
          zones stack in that same order (visión #14). */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[320px_minmax(0,1fr)_320px] lg:items-start">
        {/* IZQUIERDA — contexto */}
        <div className="lg:sticky lg:top-4 min-w-0">
          <DebtorSidebar
            data={data}
            isLoading={isLoading}
            onRevealRequest={onRevealRequest}
            caseStateKey={caseStateKey}
          />
        </div>

        {/* CENTRO — conversación e historial (los tabs, como está) */}
        <section className="min-w-0">
          {/* Zone eyebrow */}
          <h2 className="flex items-center gap-2.5 mb-3">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0"
            />
            <MonoLabel className="text-[10.5px] font-medium text-fg-subtle">
              {t('inmobiliaria.ai.cobranza.detalle.conversacion')}
            </MonoLabel>
          </h2>

          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabKey)}>
          {/* Tab nav — md+ horizontal */}
          <TabsList
            variant="underline"
            aria-label="Debtor detail tabs"
            className="hidden md:flex mb-4"
          >
            {TAB_KEYS.map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                data-testid={`tab-${k}`}
              >
                {t(`inmobiliaria.ai.cobranza.detail.tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab switcher — sm bottom-drawer trigger */}
          <div className="md:hidden mb-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={() => setTabSwitcherOpen(true)}
              data-testid="tab-switcher-button"
              className="gap-2"
            >
              <span>{t(`inmobiliaria.ai.cobranza.detail.tabs.${activeTab}`)}</span>
              <span className="text-xs text-fg-subtle">▾</span>
            </Button>
          </div>

          {/* Tab switcher drawer → Cadence Sheet (bottom) */}
          <Sheet open={tabSwitcherOpen} onOpenChange={setTabSwitcherOpen}>
            <SheetContent
              side="bottom"
              className="md:hidden max-h-[60vh] overflow-y-auto rounded-t-xl"
            >
              <SheetHeader>
                <SheetTitle className="text-lg font-semibold text-fg">{t('inmobiliaria.ai.cobranza.detail.tabs.switcher')}</SheetTitle>
              </SheetHeader>
              <ul className="mt-3 space-y-1">
                {TAB_KEYS.map((k) => (
                  <li key={k}>
                    <Button
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={() => onTabChange(k)}
                      className={
                        'w-full justify-start px-3 font-medium ' +
                        (activeTab === k
                          ? 'bg-primary-soft text-primary'
                          : 'text-fg-muted')
                      }
                    >
                      {t(`inmobiliaria.ai.cobranza.detail.tabs.${k}`)}
                    </Button>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>

          {/* Lazy-mount per active tab (D-31-09): non-active tabs unmount,
              so their data hooks do not poll until activated. */}
          <TabsContent value={activeTab} className="mt-0">
          {activeTab === 'timeline' && (
            <TimelineTab debtorId={debtorId} refetchKey={timelineRefetchKey} />
          )}
          {activeTab === 'llamadas' && (
            <LlamadasTab debtorId={debtorId} refetchKey={callsRefetchKey} />
          )}
          {activeTab === 'memos' && <MemosTab debtorId={debtorId} />}
          {activeTab === 'compromisos' && <CompromisosTab debtorId={debtorId} />}
          {activeTab === 'acciones' && (
            <AccionesTab
              debtorId={debtorId}
              debtorName={debtorName}
              currentStage={data?.currentStage ?? 'S0'}
              onIntervention={onIntervention}
            />
          )}
          </TabsContent>
          </Tabs>
        </section>

        {/* DERECHA — recomendación */}
        <div className="lg:sticky lg:top-4 min-w-0">
          <DebtorActionRail
            data={data}
            debtorId={debtorId}
            debtorName={debtorName}
            onIntervention={onIntervention}
          />
        </div>
      </div>

      {/* Shared PII reveal modal — single instance lifted here */}
      <PIIRevealModal
        open={revealModal !== null}
        field={revealModal?.field ?? null}
        debtorName={debtorName}
        onClose={() => setRevealModal(null)}
      />
    </main>
  )
}
