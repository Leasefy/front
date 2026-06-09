'use client'

/**
 * WorkItemDetalle — F7/F8 of the Agent Workspace initiative.
 *
 * The shared "Detalle de caso" body, extracted from the F6 conciliación [id]
 * page once Estudio and Matching needed the same surface (3rd copy → extract).
 *
 * Renders: breadcrumb to the cola · header with the ColaHumana
 * estado/severidad/flag vocabulary (t323 included) · left = <AccionSugerida>
 * + contexto blocks (+ optional cross-workspace link card) · right =
 * <TrazaCaso>. Handles loading, error, not-found and already-decided
 * (Decisión block, actions hidden) states.
 *
 * Pure like the other primitives: the page owns the hook
 * (useWorkItemDetail) + runWorkItemAction + navigation; this component only
 * receives data and an onAction callback.
 */

import Link from 'next/link'
import {
  ArrowRight,
  CaretLeft,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Robot,
  XCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import type { WorkItemAction } from '@/lib/api/work-item'
import type { WorkItemDetailResponse } from '@/lib/api/agent-workspace'
import { AccionSugerida } from './AccionSugerida'
import { TrazaCaso } from './TrazaCaso'
import {
  ESTADO_LABEL,
  FLAG_META,
  SEVERIDAD_LABEL,
  SEVERIDAD_TOKEN,
  relativeTime,
} from './ColaHumana'

// ── Props ───────────────────────────────────────────────────────────────────

/** Soft cross-link to a sibling workspace (AGENT-WORKSPACE-SPEC §1.5). */
export interface WorkItemDetalleCrossLink {
  /** The question the operator is likely asking, e.g. "¿Qué propiedad le calza?". */
  pregunta: string
  /** Destination label, e.g. "Workspace de Matching". */
  destino: string
  href: string
}

export interface WorkItemDetalleProps {
  data: WorkItemDetailResponse | null
  isLoading?: boolean
  error?: string | null
  /** Backend 404 — caso no encontrado (renders the not-found state). */
  notAvailable?: boolean
  /** Href of the agent's cola, used by the breadcrumb + not-found CTA. */
  colaHref: string
  /** Breadcrumb label, e.g. "Cola de conciliación". */
  colaLabel: string
  /** Phosphor icon for the breadcrumb; falls back to Robot (never crash). */
  icon?: Icon
  /** Posts the action's body to its endpoint; returns ok/error for toasting. */
  onAction: (
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  crossLink?: WorkItemDetalleCrossLink
}

// ── Component ───────────────────────────────────────────────────────────────

export function WorkItemDetalle({
  data,
  isLoading,
  error,
  notAvailable,
  colaHref,
  colaLabel,
  icon,
  onAction,
  crossLink,
}: WorkItemDetalleProps) {
  // Finite icon maps crash when a key is missing — ALWAYS fall back here.
  const BreadcrumbIcon = icon ?? Robot

  const backToCola = (
    <Link
      href={colaHref}
      className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
    >
      <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
      <BreadcrumbIcon className="w-3.5 h-3.5" aria-hidden="true" />
      {colaLabel}
    </Link>
  )

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6" data-testid="caso-loading">
        <div className="h-5 w-48 rounded bg-muted/40 animate-pulse" />
        <div className="h-8 w-2/3 rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-48 rounded-xl border border-border bg-muted/40 animate-pulse" />
            <div className="h-32 rounded-xl border border-border bg-muted/40 animate-pulse" />
          </div>
          <div className="lg:col-span-2 h-64 rounded-xl border border-border bg-muted/40 animate-pulse" />
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {backToCola}
        <div
          className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-400"
          data-testid="caso-error"
        >
          No se pudo cargar el caso: {error}
        </div>
      </div>
    )
  }

  // ── Not found (404 / missing) ─────────────────────────────────────────────
  if (!data || notAvailable) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {backToCola}
        <div
          className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
          data-testid="caso-not-found"
        >
          <MagnifyingGlass
            className="w-8 h-8 mx-auto text-muted-foreground mb-2"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">Caso no encontrado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Puede que ya se haya resuelto o que el enlace no sea válido.
          </p>
          <Link
            href={colaHref}
            className="inline-flex items-center gap-1 mt-3 text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition"
          >
            Volver a la cola
          </Link>
        </div>
      </div>
    )
  }

  const { item, contexto, traza } = data
  const sev = SEVERIDAD_TOKEN[item.severidad]
  const isDecided = item.estado === 'resuelto' || item.estado === 'rechazado'

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid={`caso-${item.id}`}>
      {/* Breadcrumb + header */}
      <header className="space-y-2">
        {backToCola}
        <h1 className="text-2xl font-semibold text-foreground">{item.titulo}</h1>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
          >
            {SEVERIDAD_LABEL[item.severidad]}
          </span>
          <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border bg-muted">
            {ESTADO_LABEL[item.estado]}
          </span>
          {item.flags.map((flag) => {
            const meta = FLAG_META[flag]
            const FlagIcon = meta.icon
            return (
              <span
                key={flag}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
              >
                <FlagIcon className="w-3 h-3" aria-hidden="true" />
                {meta.label}
              </span>
            )
          })}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {relativeTime(item.createdAt)}
          </span>
        </div>
      </header>

      {/* 2-col: suggestion + contexto | traza */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {isDecided ? (
            /* Already decided — actions hidden, show the decision block */
            <div
              className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-2"
              data-testid="caso-decision"
            >
              <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                Decisión
              </p>
              <div className="flex items-center gap-2">
                {item.estado === 'resuelto' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" weight="duotone" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500" weight="duotone" aria-hidden="true" />
                )}
                <p className="text-sm font-semibold text-foreground">{ESTADO_LABEL[item.estado]}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.decidedBy ? `Por ${item.decidedBy}` : 'Decisión registrada'}
                {item.decidedAt ? ` · ${relativeTime(item.decidedAt)}` : ''}
              </p>
            </div>
          ) : (
            <AccionSugerida
              accion={item.accionSugerida}
              actions={item.actions}
              onAction={onAction}
            />
          )}

          {/* Contexto blocks */}
          {contexto.map((block, i) => (
            <section
              key={`${block.title}-${i}`}
              className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-2"
              data-testid={`caso-contexto-${i}`}
            >
              <h2 className="text-sm font-semibold text-foreground">{block.title}</h2>
              <dl className="divide-y divide-border">
                {block.rows.map((row, j) => (
                  <div
                    key={`${row.label}-${j}`}
                    className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className="text-xs font-medium text-foreground tabular-nums text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          {/* Soft cross-link to a sibling workspace */}
          {crossLink && (
            <Link
              href={crossLink.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:bg-muted/50 transition group"
              data-testid="caso-cross-link"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{crossLink.pregunta}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{crossLink.destino}</p>
              </div>
              <ArrowRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition shrink-0"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>

        {/* Traza */}
        <aside className="lg:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Traza del caso</h2>
          <TrazaCaso entries={traza} />
        </aside>
      </div>
    </div>
  )
}
