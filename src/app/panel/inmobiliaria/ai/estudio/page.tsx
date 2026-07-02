'use client'

/**
 * /ai/estudio — Tier-B "Estudios de inquilinos" overview (visión §3 / §19).
 *
 * Reemplaza el <SalaAgente> genérico por una Sala a medida (espejo de cobranza):
 * resumen ejecutivo + KPIs + "Qué necesita tu atención" + pipeline por estado +
 * actividad reciente + "cómo funciona". Se alimenta del overview funcional ya
 * cableado (useEstudioOverview → AgentOverviewResponse). UX-only.
 */

import Link from 'next/link'
import {
  ChartBar,
  CheckCircle,
  ClipboardText,
  FileMagnifyingGlass,
  ShieldCheck,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui/button'
import { useEstudioOverview } from '@/lib/hooks/estudio/use-estudio-overview'
import { EstudioKpiStrip } from '@/components/inmobiliaria/estudio/EstudioKpiStrip'
import { EstudioOverviewSkeleton } from '@/components/skeleton/panel/EstudioOverviewSkeleton'
import { relativeTime } from '@/lib/cartera'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.estudio'
const NS = 'inmobiliaria.ai.estudio'

/** "Cómo funciona" — los 4 pasos del estudio (se conserva del Sala anterior). */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: ClipboardText, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: FileMagnifyingGlass, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: ChartBar, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
  { icon: CheckCircle, titleKey: `${PAGES_NS}.comoFunciona.step4.title`, descKey: `${PAGES_NS}.comoFunciona.step4.desc` },
]

function EstudioOverview() {
  const { t, locale } = useI18n()
  const { data, isLoading, error } = useEstudioOverview()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  if (isLoading && !data) return <EstudioOverviewSkeleton />

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header — resumen ejecutivo */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {tf(`${NS}.overview.title`, 'Estudios de inquilinos')}
          </h1>
          <p className="text-sm text-fg-muted mt-0.5 max-w-2xl">
            {tf(
              `${NS}.overview.subtitle`,
              'Evalúa candidatos, valida su información y decide con mayor seguridad quién puede avanzar en el proceso de arriendo.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {data?.generatedAt && (
            <p className="text-xs text-fg-muted whitespace-nowrap">
              {tf(`${NS}.overview.lastUpdated`, 'Actualizado hace')} {relativeTime(data.generatedAt, locale)}
            </p>
          )}
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/ai/estudio/estudios">
              {tf(`${NS}.overview.verEstudios`, 'Ver estudios')}
            </Link>
          </Button>
        </div>
      </header>

      {/* Empty (sin datos del overview) — el header ya es dueño del CTA "Ver
          estudios", así que aquí NO se duplica la acción (contrato §6). */}
      {!data && !isLoading && !error && (
        <EmptyState
          icon={ShieldCheck}
          title={tf(`${NS}.overview.empty.title`, 'Aún no hay estudios')}
          description={tf(
            `${NS}.overview.empty.description`,
            'Cuando llegue un estudio de inquilino, sus métricas y pendientes aparecerán aquí.',
          )}
        />
      )}

      {data && (
        <>
          {/* KPIs (visión §3 / §19) */}
          <EstudioKpiStrip kpis={data.kpis} isLoading={isLoading} />

          {/* Qué necesita tu atención (visión §3) → bandeja /estudios */}
          <section className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                <ClipboardText className="w-5 h-5 text-fg" weight="duotone" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-fg">
                  {tf(`${NS}.overview.atencion.title`, 'Qué necesita tu atención')}
                </h2>
                <p className="text-sm text-fg-muted">
                  {tf(
                    `${NS}.overview.atencion.desc`,
                    'Revisa los estudios priorizados por severidad y abre cada caso para decidir.',
                  )}
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" hideArrow className="shrink-0">
              <Link href="/panel/inmobiliaria/ai/estudio/estudios">
                {tf(`${NS}.overview.atencion.cta`, 'Abrir bandeja')}
              </Link>
            </Button>
          </section>

          {/* Pipeline por estado */}
          {data.pipeline.length > 0 && (
            <section aria-label={tf(`${NS}.overview.pipeline.title`, 'Pipeline por estado')}>
              <h2 className="text-base font-semibold text-fg mb-3">
                {tf(`${NS}.overview.pipeline.title`, 'Pipeline por estado')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.pipeline.map((seg) => (
                  <div
                    key={seg.estado}
                    className="rounded-xl border border-border bg-card p-4"
                    data-estado={seg.estado}
                  >
                    <p className="text-xs font-medium text-fg-muted truncate">
                      {tf(`inmobiliaria.ai.workspace.estado.${seg.estado}`, seg.estado)}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-fg tabular-nums">
                      {seg.count}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actividad reciente */}
          {data.feed.length > 0 && (
            <section aria-label={tf(`${NS}.overview.feed.title`, 'Actividad reciente')}>
              <h2 className="text-base font-semibold text-fg mb-3">
                {tf(`${NS}.overview.feed.title`, 'Actividad reciente')}
              </h2>
              <ul
                role="list"
                className="rounded-xl border border-border bg-card divide-y divide-border"
              >
                {data.feed.slice(0, 8).map((f) => (
                  <li key={f.id} className="px-4 py-3 flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
                        f.actorType === 'agent'
                          ? 'bg-primary'
                          : f.actorType === 'user'
                            ? 'bg-success-500'
                            : 'bg-fg-subtle',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{f.titulo}</p>
                      <p className="text-xs text-fg-muted">{f.detalle}</p>
                    </div>
                    <span className="text-xs text-fg-muted whitespace-nowrap shrink-0">
                      {relativeTime(f.occurredAt, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Cómo funciona — el viaje del estudio en 4 pasos (step-strip parejo) */}
      <section className="space-y-3" data-testid="estudio-como-funciona">
        <h2 className="text-base font-semibold text-fg">{t(`${PAGES_NS}.comoFunciona.title`)}</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMO_FUNCIONA_STEPS.map((step, i) => {
            const StepIcon = step.icon
            return (
              <li
                key={step.titleKey}
                className="h-full rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                    <StepIcon className="w-5 h-5 text-primary" weight="duotone" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium text-fg-muted tabular-nums">
                    {tf(`${PAGES_NS}.comoFunciona.paso`, 'Paso')} {i + 1}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-fg leading-tight">{t(step.titleKey)}</p>
                  <p className="text-xs text-fg-muted leading-snug">{t(step.descKey)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Error (no bloqueante) */}
      {error && !isLoading && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {tf(`${NS}.overview.errorLoading`, 'Error al cargar los estudios')}: {error}
        </div>
      )}
    </main>
  )
}

export default function EstudioOverviewPage() {
  return (
    <PageGuard module="estudio">
      <EstudioOverview />
    </PageGuard>
  )
}
