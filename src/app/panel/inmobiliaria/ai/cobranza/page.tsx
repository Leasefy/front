'use client'

import * as React from 'react'
import { useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CaretRight,
  ChatCircleText,
  ClipboardText,
  CreditCard,
  FolderOpen,
  Scales,
  UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { useCarteraOverview } from '@/lib/hooks/cobranza/use-cartera-overview'
import { useStageTransitionsRealtime } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import type { StageTransitionEvent } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import { CobranzaResultadosKpis } from '@/components/inmobiliaria/cobranza/CobranzaResultadosKpis'
import { CobranzaAnaliticaResumen } from '@/components/inmobiliaria/cobranza/CobranzaAnaliticaResumen'
import { CobranzaTeTocaATi } from '@/components/inmobiliaria/cobranza/CobranzaTeTocaATi'
import { CobranzaDeudoresQuePesan } from '@/components/inmobiliaria/cobranza/CobranzaDeudoresQuePesan'
import { CobranzaStageCard } from '@/components/inmobiliaria/cobranza/CobranzaStageCard'
import { CobranzaFunnelChart } from '@/components/inmobiliaria/cobranza/CobranzaFunnelChart'
import { CobranzaTransitionsFeed } from '@/components/inmobiliaria/cobranza/CobranzaTransitionsFeed'
import { CobranzaNextActionsPanel } from '@/components/inmobiliaria/cobranza/CobranzaNextActionsPanel'
import { CobranzaOverviewSkeleton } from '@/components/skeleton/panel/CobranzaOverviewSkeleton'
import { CobranzaImportCard } from '@/components/inmobiliaria/cobranza/CobranzaImportCard'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui'
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
  const { data, isLoading, error, refetch } = useCarteraOverview()

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

  // ── Momento wow (visión #21) — datos del overview para el banner ──────────
  // enMora = suma de counts de S1..SX (S0 = al día, queda fuera).
  const enMora = useMemo(
    () =>
      (data?.stages ?? [])
        .filter((s) => s.stage !== 'S0')
        .reduce((acc, s) => acc + s.count, 0),
    [data?.stages],
  )
  const prejuridicoCount = useMemo(
    () => data?.stages.find((s) => s.stage === 'S3')?.count ?? 0,
    [data?.stages],
  )

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
        {/* Importar cartera — ahora cableada al endpoint POST /cartera/import.
            FAIL-SOFT: si el backend no está desplegado (404/red), el card
            degrada a "Próximamente — requiere despliegue" sin romper. Tras un
            import exitoso refrescamos el overview para salir del empty state. */}
        <CobranzaImportCard onImported={() => void refetch()} />
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
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            {t('inmobiliaria.ai.cobranza.overview.title')}
          </h1>
          <p className="text-fg-muted mt-0.5 text-sm">
            {t(`${PAGES_NS}.salaDesc`)}
          </p>
        </div>
        {data?.generatedAt && (
          <p className="text-xs text-fg-subtle whitespace-nowrap mt-1 flex items-center gap-2">
            {t('inmobiliaria.ai.cobranza.overview.lastUpdated')}{' '}
            {relativeTime(data.generatedAt, locale)}
            {isConnected && (
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full bg-success animate-ping"
                aria-hidden="true"
              />
            )}
          </p>
        )}
      </header>

      {/* ═══ 1. TE TOCA A TI ═══════════════════════════════════════════════
          Lo único que pide que una persona haga algo. Reemplaza cuatro
          superficies que contestaban la misma pregunta: el banner narrativo,
          la fila de 4 tarjetas, la tarjeta «Revisar escalaciones» y la lista
          «Qué necesita tu atención hoy» — con el mismo número repetido cuatro
          veces y la lista, lo único accionable, al final. */}
      <CobranzaTeTocaATi enMora={enMora} gestionados={data?.kpis.llamadasHoy ?? 0} />

      {/* ═══ 2. LO QUE HIZO EL AGENTE ══════════════════════════════════════
          Resultado del trabajo automático. Es información, no acción: por eso
          va DESPUÉS de lo que te toca, y sin botones que compitan. */}
      <section className="space-y-4" aria-labelledby="cobranza-agente">
        {/* Título y botón en LA MISMA fila. El botón vivía dentro de
            CobranzaResultadosKpis en una fila propia `justify-end`: quedaba
            una franja casi vacía entre el título y las tarjetas, como si a la
            sección le faltara algo (screenshot de Nico, 2026-08-25). */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 id="cobranza-agente" className="text-lg font-semibold text-fg">
            Lo que hizo el agente
          </h2>
          {/* Solo el reporte diario: la analítica se fusionó en esta misma
              pantalla, así que enlazarla sería mandar a la gente a donde ya está. */}
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/ai/cobranza/reporte">
              <Scales className="w-4 h-4" aria-hidden="true" />
              Ver reporte diario
            </Link>
          </Button>
        </div>
        <CobranzaResultadosKpis overview={data} />
        {/* Se monta solo con analítica de verdad (≥5 llamadas en 30 días). */}
        <CobranzaAnaliticaResumen />
      </section>

      {/* ═══ 3. TU CARTERA ═════════════════════════════════════════════════
          Cómo está compuesta la mora: en qué etapa está cada caso, cómo se
          mueve entre etapas, y quiénes pesan más. Las tres respondían la misma
          pregunta desde tres lugares distintos de la página. */}
      <section className="space-y-4" aria-labelledby="cobranza-cartera">
        <h2 id="cobranza-cartera" className="text-lg font-semibold text-fg">
          Tu cartera
        </h2>

        {/* Etapas — tablist con roving tabindex (D-38-13) */}
        <div
          role="tablist"
          aria-label={t('inmobiliaria.ai.cobranza.overview.stages.title')}
          aria-orientation="horizontal"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3"
        >
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

        {/* Tabpanel — lo exige ARIA cuando hay role=tab + aria-controls */}
        {/* Dos columnas sólo cuando hay dos cosas. `CobranzaDeudoresQuePesan`
            no se monta sin datos, y una grilla de 2 con una celda vacía dejaba
            el embudo a media pantalla, como si le faltara algo al lado. */}
        <div
          role="tabpanel"
          id="stage-panel"
          aria-labelledby={`stage-tab-${focusedStage}`}
          className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4 [&>*:only-child]:lg:col-span-2"
        >
          <CobranzaFunnelChart
            stages={data?.stages.map((s) => ({ stage: s.stage, count: s.count })) ?? []}
            isLoading={isLoading}
          />
          {/* «Los que más pesan» estaba entre siniestros y alertas de umbral,
              como si fuera algo que atender hoy. Es composición de cartera. */}
          <CobranzaDeudoresQuePesan />
        </div>
      </section>

      {/* ═══ 4. ACTIVIDAD ══════════════════════════════════════════════════ */}
      <section className="space-y-4" aria-labelledby="cobranza-actividad">
        <h2 id="cobranza-actividad" className="text-lg font-semibold text-fg">
          Actividad
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3">
            <CobranzaTransitionsFeed transitions={transitions} isLoading={isLoading} />
          </div>
          <div className="md:col-span-2">
            <CobranzaNextActionsPanel actions={data?.nextActions ?? []} isLoading={isLoading} />
          </div>
        </div>
      </section>

      {/* ═══ ¿Cómo funciona? ═══════════════════════════════════════════════
          Contenido de aprendizaje, no de operación. Estaba clavado en mitad
          del tablero, ocupando el mismo peso que las decisiones del día, todos
          los días — también al año de usar el producto. Ahora se abre solo si
          alguien lo pide, y arranca ABIERTO cuando no hay cartera todavía, que
          es cuando de verdad sirve. */}
      <details
        className="group rounded-xl border border-border bg-card"
        open={enMora === 0}
        data-testid="cobranza-como-funciona"
      >
        <summary className="flex items-center gap-2 cursor-pointer list-none px-5 py-4 text-sm font-semibold text-fg">
          <CaretRight
            className="w-4 h-4 text-fg-muted transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          {t(`${PAGES_NS}.comoFunciona.title`)}
        </summary>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-5 pb-5">
          {COMO_FUNCIONA_STEPS.map((step, i) => {
            const StepIcon = step.icon
            return (
              <li key={step.titleKey} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                    <StepIcon className="w-4 h-4 text-primary" weight="duotone" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium text-fg-muted font-mono tabular-nums">
                    {i + 1}
                  </span>
                </div>
                <p className="text-sm font-semibold text-fg leading-tight">{t(step.titleKey)}</p>
                <p className="text-xs text-fg-muted leading-snug">{t(step.descKey)}</p>
              </li>
            )
          })}
        </ol>
      </details>

      {/* Fallo al cargar el panorama de cartera. Va al final y no tapa nada:
          las secciones que sí cargaron siguen siendo útiles. */}
      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          {t('inmobiliaria.ai.cobranza.overview.errorLoading')}: {error}
        </div>
      )}
    </main>
  )
}
