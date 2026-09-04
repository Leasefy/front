'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  ClipboardText,
  Lightning,
  Plus,
  ShieldCheck,
  Tray,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import {
  useCotizadorOverview,
  type CotizadorOverviewResponse,
  type QuoteInsertEvent,
} from '@/lib/hooks/cotizador/use-cotizador-overview'
import { CotizadorKpiStrip } from '@/components/inmobiliaria/cotizador/CotizadorKpiStrip'
import { CotizadorPriorityInbox } from '@/components/inmobiliaria/cotizador/CotizadorPriorityInbox'
import { CotizadorRecentQuotesFeed } from '@/components/inmobiliaria/cotizador/CotizadorRecentQuotesFeed'
import { CotizadorCarriersStatus } from '@/components/inmobiliaria/cotizador/CotizadorCarriersStatus'
import { CotizadorOverviewSkeleton } from '@/components/skeleton/panel/CotizadorOverviewSkeleton'
import { SinDatos } from '@/components/estado/SinDatos'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/cartera'

// Permissions gate is enforced by the cotizador layout (Phase 29).
// This page does NOT re-check canAccess — layout handles 403 before mount.

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.cotizador'

/** "Cómo funciona" — los 4 pasos del viaje de la cotización (markup como avaluos). */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: ClipboardText, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: Lightning, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: ShieldCheck, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
  { icon: CheckCircle, titleKey: `${PAGES_NS}.comoFunciona.step4.title`, descKey: `${PAGES_NS}.comoFunciona.step4.desc` },
]

/** Sección "¿Cómo funciona?" — step-strip 4-up parejo (UI-DS-CONTRACT §7). */
function ComoFuncionaCotizador() {
  const { t } = useI18n()
  return (
    <div
      className="rounded-lg border border-border bg-card p-5 space-y-4"
      data-testid="cotizador-como-funciona"
    >
      <h2 className="text-base font-semibold text-fg">
        {t(`${PAGES_NS}.comoFunciona.title`)}
      </h2>
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COMO_FUNCIONA_STEPS.map((step, i) => {
          const StepIcon = step.icon
          return (
            <li
              key={step.titleKey}
              className="h-full rounded-lg border border-border bg-surface p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-md bg-primary-soft text-primary shrink-0">
                  <StepIcon className="size-4" weight="duotone" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium tabular-nums text-fg-muted">
                  {i + 1}
                </span>
              </div>
              <p className="text-sm font-semibold text-fg leading-snug">
                {t(step.titleKey)}
              </p>
              <p className="text-xs text-fg-muted leading-snug">{t(step.descKey)}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function CotizadorOverviewPage() {
  const { t, locale } = useI18n()
  // t() with raw-key fallback so a missing key never renders the path.
  const tf = (k: string, fb: string) => {
    const r = t(k)
    return r === k ? fb : r
  }

  const {
    data,
    isLoading,
    error,
    isRealtimeConnected,
    realtimeQuotes,
  } = useCotizadorOverview()

  // Merge realtime-prepended quotes with endpoint quotes, dedup by id
  const mergedQuotes = useMemo<CotizadorOverviewResponse['lastQuotes']>(() => {
    const endpointQuotes = data?.lastQuotes ?? []
    // Convert QuoteInsertEvent to lastQuotes shape
    const rtQuotes = realtimeQuotes.map(
      (q: QuoteInsertEvent): CotizadorOverviewResponse['lastQuotes'][0] => ({
        id: q.id,
        cedulaHashPrefix8: q.cedulaHashPrefix8,
        canonCop: q.canonCop,
        ciudad: q.ciudad,
        status: q.status,
        createdAt: q.createdAt,
        approvedCount: q.approvedCount,
        totalCarriers: q.totalCarriers,
      }),
    )
    const merged = [...rtQuotes, ...endpointQuotes]
    const seen = new Set<string>()
    return merged
      .filter((q) => {
        if (seen.has(q.id)) return false
        seen.add(q.id)
        return true
      })
      .slice(0, 10)
  }, [realtimeQuotes, data?.lastQuotes])

  // ── Skeleton + EmptyState guards (Phase 38 plan 38-04b / D-38-04) ─────────
  if (isLoading && !data) return <CotizadorOverviewSkeleton />

  if (!isLoading && !error && mergedQuotes.length === 0) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        {/* Dentro de un recuadro: sin él el mensaje quedaba flotando en el
            medio de la página y no se leía como una sección. */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <SinDatos
            queSon="cotizaciones"
            icono={Tray}
            titulo={t('inmobiliaria.ai.cotizador.overview.empty.title')}
            descripcion={t('inmobiliaria.ai.cotizador.overview.empty.description')}
            crear={{
              label: t('inmobiliaria.ai.cotizador.overview.empty.cta.label'),
              href: '/panel/inmobiliaria/postulaciones/asegurabilidad/nueva',
            }}
          />
        </div>
        {/* La cola de consultas es independiente del feed de cotizaciones:
            puede haber casos pendientes aunque hoy no se haya creado ninguna. */}
        <CotizadorPriorityInbox />
        {/* ¿Cómo funciona? — especialmente útil cuando aún no hay cotizaciones */}
        <ComoFuncionaCotizador />
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.ai.cotizador.overview.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {/* Positioning copy (visión #1: "radar de asegurabilidad"). Cae al
                subtítulo de beneficio existente si la clave nueva falta. */}
            {tf(
              'inmobiliaria.ai.cotizador.overview.radarSubtitle',
              t(`${PAGES_NS}.salaSubtitle`),
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data?.generatedAt && (
            <p className="text-xs text-fg-muted whitespace-nowrap flex items-center gap-2 mr-1">
              {t('inmobiliaria.ai.cotizador.overview.lastUpdated')}{' '}
              {relativeTime(data.generatedAt, locale)}
              {isRealtimeConnected && (
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-success animate-ping"
                  aria-hidden="true"
                />
              )}
            </p>
          )}
          {/* CTA secundario — cola de verdicts por revisar (sin N: el overview
              no trae ese count barato; la cola lo calcula al abrir) */}
          <Button variant="secondary" size="sm" hideArrow asChild>
            <Link href="/panel/inmobiliaria/postulaciones/asegurabilidad/cola">
              <Tray className="h-4 w-4" weight="duotone" />
              {t(`${PAGES_NS}.colaLabel`)}
            </Link>
          </Button>
          {/* Nueva cotización — único CTA primario de la vista (COTI-UI-01) */}
          <Button size="sm" hideArrow asChild>
            <Link href="/panel/inmobiliaria/postulaciones/asegurabilidad/nueva">
              <Plus className="h-4 w-4" weight="bold" />
              {t('inmobiliaria.ai.cotizador.overview.newQuoteCta')}
            </Link>
          </Button>
        </div>
      </header>

      {/* KPI Strip */}
      <CotizadorKpiStrip kpis={data?.kpis ?? null} isLoading={isLoading} />

      {/* Consultas que necesitan atención (visión #4) — cola priorizada arriba
          del feed, lo primero accionable que ve el operador. */}
      <CotizadorPriorityInbox />

      {/* Recent Quotes Feed */}
      <section aria-label={t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}>
        <h2 className="text-base font-semibold text-fg mb-3">
          {t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}
        </h2>
        <CotizadorRecentQuotesFeed quotes={mergedQuotes} isLoading={isLoading} />
      </section>

      {/* Carriers Status */}
      <section aria-label={t('inmobiliaria.ai.cotizador.overview.carriers.title')}>
        <h2 className="text-base font-semibold text-fg mb-3">
          {t('inmobiliaria.ai.cotizador.overview.carriers.title')}
        </h2>
        <CotizadorCarriersStatus carriers={data?.carriers ?? []} isLoading={isLoading} />
      </section>

      {/* ¿Cómo funciona? — el viaje de la cotización en 4 pasos */}
      <section aria-label={t(`${PAGES_NS}.comoFunciona.title`)}>
        <ComoFuncionaCotizador />
      </section>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {t('inmobiliaria.ai.cotizador.overview.errorLoading')}: {error}
        </div>
      )}
    </main>
  )
}
