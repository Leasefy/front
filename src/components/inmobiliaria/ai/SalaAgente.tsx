'use client'

/**
 * SalaAgente — F6 of the Agent Workspace initiative (AGENT-WORKSPACE-SPEC §1.4).
 *
 * The generic per-agent "Sala": header (icon badge + título + descripción +
 * CTA "Ir a la cola (N)"), KPI strip (number / percent / cop formats),
 * pipeline por estado (stacked bar reusing the ColaHumana estado vocabulary)
 * and the last-activity feed (actorType badge + relative time).
 *
 * 404 from the overview endpoint (overview === null, no error) renders a
 * friendly "El agente aún no reporta métricas" panel — NOT an error banner.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Robot } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import type { AgenteId, WorkItemEstado } from '@/lib/api/work-item'
import type { AgentOverviewResponse, KpiFormat } from '@/lib/api/agent-workspace'
import { ESTADO_LABEL } from './ColaHumana'
import { actorMeta } from './TrazaCaso'
import { relativeTime } from './ColaHumana'

// ── Vocabulary ──────────────────────────────────────────────────────────────

/** Pipeline segment colors per estado (ColaHumana has no per-estado color). */
const ESTADO_BAR_CLS: Record<WorkItemEstado, string> = {
  detectado: 'bg-slate-400 dark:bg-slate-500',
  sugerido: 'bg-sky-500',
  en_revision: 'bg-amber-500',
  aprobado: 'bg-emerald-500',
  ejecutando: 'bg-indigo-500',
  resuelto: 'bg-emerald-600',
  rechazado: 'bg-rose-500',
  fallo: 'bg-rose-700',
}

const numberFormatter = new Intl.NumberFormat('es-CO')
const percentFormatter = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** number → "1.234" · percent (fraction) → "82,5 %" · cop → "$ 1.250.000". */
export function formatKpiValue(value: number, format: KpiFormat): string {
  switch (format) {
    case 'percent':
      return percentFormatter.format(value)
    case 'cop':
      return copFormatter.format(value)
    default:
      return numberFormatter.format(value)
  }
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface SalaAgenteProps {
  agente: AgenteId
  titulo: string
  descripcion: string
  /** Phosphor icon for the agent; falls back to Robot when omitted. */
  icon?: Icon
  overview: AgentOverviewResponse | null
  isLoading?: boolean
  error?: string | null
  colaHref: string
  colaCount?: number
  /** Extra domain-specific slot rendered between header and metrics. */
  children?: ReactNode
}

// ── Overview body (early-return states) ─────────────────────────────────────

function OverviewBody({
  overview,
  isLoading,
  error,
}: Pick<SalaAgenteProps, 'overview' | 'isLoading' | 'error'>) {
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="sala-agente-loading">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-24 rounded-xl border border-border bg-muted/40 animate-pulse" />
        <div className="h-40 rounded-xl border border-border bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-400"
        data-testid="sala-agente-error"
      >
        No se pudo cargar la sala: {error}
      </div>
    )
  }

  if (!overview) {
    // 404 / notAvailable — graceful empty state, NOT an error banner.
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
        data-testid="sala-agente-empty"
      >
        <Robot className="w-8 h-8 mx-auto text-muted-foreground mb-2" weight="duotone" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">El agente aún no reporta métricas</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Este panel se activa cuando el agente publique su resumen de actividad.
        </p>
      </div>
    )
  }

  const pipelineTotal = overview.pipeline.reduce((sum, seg) => sum + seg.count, 0)

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      {overview.kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="sala-kpi-strip">
          {overview.kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="rounded-xl border border-border bg-card p-4"
              data-testid={`sala-kpi-${kpi.id}`}
            >
              <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">
                {formatKpiValue(kpi.value, kpi.format)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline por estado */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="sala-pipeline">
        <h2 className="text-sm font-semibold text-foreground">Pipeline por estado</h2>
        {pipelineTotal === 0 ? (
          <p className="text-xs text-muted-foreground">Sin casos en el pipeline.</p>
        ) : (
          <>
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Pipeline: ${pipelineTotal} casos`}
            >
              {overview.pipeline
                .filter((seg) => seg.count > 0)
                .map((seg) => (
                  <span
                    key={seg.estado}
                    className={`${ESTADO_BAR_CLS[seg.estado] ?? 'bg-neutral-400'} h-full`}
                    style={{ width: `${(seg.count / pipelineTotal) * 100}%` }}
                    title={`${ESTADO_LABEL[seg.estado] ?? seg.estado}: ${seg.count}`}
                  />
                ))}
            </div>
            <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
              {overview.pipeline.map((seg) => (
                <div key={seg.estado} className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${ESTADO_BAR_CLS[seg.estado] ?? 'bg-neutral-400'}`}
                    aria-hidden="true"
                  />
                  <dt className="text-[11px] text-muted-foreground">
                    {ESTADO_LABEL[seg.estado] ?? seg.estado}
                  </dt>
                  <dd className="text-[11px] font-medium text-foreground tabular-nums">{seg.count}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>

      {/* Actividad reciente */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="sala-feed">
        <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
        {overview.feed.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin actividad reciente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.feed.map((entry) => {
              const meta = actorMeta(entry.actorType)
              return (
                <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2">
                  <span
                    className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full ring-1 shrink-0 mt-0.5 ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.detalle}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 mt-0.5">
                    {relativeTime(entry.occurredAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

export function SalaAgente({
  agente,
  titulo,
  descripcion,
  icon,
  overview,
  isLoading,
  error,
  colaHref,
  colaCount,
  children,
}: SalaAgenteProps) {
  // Finite icon maps crash when a key is missing — ALWAYS fall back here.
  const HeaderIcon = icon ?? Robot

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid={`sala-agente-${agente}`}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            <HeaderIcon className="w-3.5 h-3.5" weight="duotone" aria-hidden="true" />
            Agente · {titulo}
          </span>
          <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">{descripcion}</p>
        </div>

        <Link
          href={colaHref}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition"
          data-testid="sala-cola-cta"
        >
          Ir a la cola{typeof colaCount === 'number' ? ` (${numberFormatter.format(colaCount)})` : ''}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </header>

      {/* Domain-specific slot */}
      {children}

      <OverviewBody overview={overview} isLoading={isLoading} error={error} />
    </div>
  )
}
