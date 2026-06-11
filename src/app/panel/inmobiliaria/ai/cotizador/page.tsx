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
import { CotizadorRecentQuotesFeed } from '@/components/inmobiliaria/cotizador/CotizadorRecentQuotesFeed'
import { CotizadorCarriersStatus } from '@/components/inmobiliaria/cotizador/CotizadorCarriersStatus'
import { CotizadorOverviewSkeleton } from '@/components/skeleton/panel/CotizadorOverviewSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
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

/** Sección "¿Cómo funciona?" — pasos numerados, mismo patrón que avaluos/page.tsx. */
function ComoFuncionaCotizador() {
  const { t } = useI18n()
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 max-w-3xl space-y-4"
      data-testid="cotizador-como-funciona"
    >
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
  )
}

export default function CotizadorOverviewPage() {
  const { t, locale } = useI18n()

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
        <EmptyState
          icon={Tray}
          title={t('inmobiliaria.ai.cotizador.overview.empty.title')}
          description={t('inmobiliaria.ai.cotizador.overview.empty.description')}
          primaryCta={{
            label: t('inmobiliaria.ai.cotizador.overview.empty.cta.label'),
            href: '/panel/inmobiliaria/ai/cotizador/nueva',
          }}
        />
        {/* ¿Cómo funciona? — especialmente útil cuando aún no hay cotizaciones */}
        <ComoFuncionaCotizador />
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cotizador.overview.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {/* Subtítulo de beneficio (el anterior era mecánico: "Estado de las cotizaciones…") */}
            {t(`${PAGES_NS}.salaSubtitle`)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {data?.generatedAt && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap flex items-center gap-2">
              {t('inmobiliaria.ai.cotizador.overview.lastUpdated')}{' '}
              {relativeTime(data.generatedAt, locale)}
              {isRealtimeConnected && (
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"
                  aria-hidden="true"
                />
              )}
            </p>
          )}
          {/* CTA secundario — cola de verdicts por revisar (sin N: el overview
              no trae ese count barato; la cola lo calcula al abrir) */}
          <Link
            href="/panel/inmobiliaria/ai/cotizador/cola"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1A40FF]"
          >
            <Tray className="h-4 w-4" weight="duotone" />
            {t(`${PAGES_NS}.colaLabel`)}
          </Link>
          {/* Nueva cotización CTA — per COTI-UI-01 */}
          <Link
            href="/panel/inmobiliaria/ai/cotizador/nueva"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
          >
            <Plus className="h-4 w-4" weight="bold" />
            {t('inmobiliaria.ai.cotizador.overview.newQuoteCta')}
          </Link>
        </div>
      </header>

      {/* KPI Strip */}
      <CotizadorKpiStrip kpis={data?.kpis ?? null} isLoading={isLoading} />

      {/* Recent Quotes Feed */}
      <section aria-label={t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
          {t('inmobiliaria.ai.cotizador.overview.recentQuotes.title')}
        </h2>
        <CotizadorRecentQuotesFeed quotes={mergedQuotes} isLoading={isLoading} />
      </section>

      {/* Carriers Status */}
      <section aria-label={t('inmobiliaria.ai.cotizador.overview.carriers.title')}>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
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
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
          {t('inmobiliaria.ai.cotizador.overview.errorLoading')}: {error}
        </div>
      )}
    </main>
  )
}
