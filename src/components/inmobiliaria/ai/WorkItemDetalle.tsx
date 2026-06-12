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
 * <TrazaCaso>. Handles loading, error, not-available (the agent doesn't
 * publish a detail resolver — 404), not-found (the item is missing) and
 * already-decided (Decisión block, actions hidden) states.
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

import type { WorkItemAction, WorkItemEstado } from '@/lib/api/work-item'
import type { WorkItemDetailResponse } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { AccionSugerida } from './AccionSugerida'
import { TrazaCaso } from './TrazaCaso'
import {
  FLAG_META,
  SEVERIDAD_TOKEN,
  estadoLabel,
  flagLabel,
  relativeTime,
  severidadLabel,
} from './ColaHumana'

const NS = 'inmobiliaria.ai.workspace.detalle'

/**
 * Estados where the human can still act. Everything else
 * (aprobado | ejecutando | resuelto | rechazado | fallo) shows the status
 * block and hides the action buttons.
 */
const ACTIONABLE_ESTADOS: ReadonlySet<WorkItemEstado> = new Set([
  'detectado',
  'sugerido',
  'en_revision',
])

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
  /**
   * Backend 404 — the agent doesn't publish a detail resolver (yet). Renders
   * the "Detalle no disponible" state, NOT "Caso no encontrado".
   */
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
  /** Optional CTA for the not-available/not-found states (pill link). */
  notFoundAction?: { label: string; href: string }
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
  notFoundAction,
}: WorkItemDetalleProps) {
  const { t } = useI18n()
  // Finite icon maps crash when a key is missing — ALWAYS fall back here.
  const BreadcrumbIcon = icon ?? Robot

  const backToCola = (
    <Link
      href={colaHref}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition"
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
          className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-4 text-sm text-[#C4503B] dark:text-[#E0664D]"
          data-testid="caso-error"
        >
          {t(`${NS}.error`, { error })}
        </div>
      </div>
    )
  }

  // The CTA out of the empty states: the page's notFoundAction (primary pill)
  // or the classic "Volver a la cola" link.
  const emptyStateCta = notFoundAction ? (
    <Link
      href={notFoundAction.href}
      className="inline-flex items-center gap-1 mt-3 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition"
      data-testid="caso-not-found-action"
    >
      {notFoundAction.label}
    </Link>
  ) : (
    <Link
      href={colaHref}
      className="inline-flex items-center gap-1 mt-3 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition"
    >
      {t(`${NS}.volverACola`)}
    </Link>
  )

  // ── Not available (404 — the backend doesn't publish the resolver) ────────
  // Distinct from "Caso no encontrado": the case may exist, but this agent
  // doesn't expose a detail endpoint yet.
  if (notAvailable) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {backToCola}
        <div
          className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
          data-testid="caso-no-disponible"
        >
          <Robot
            className="w-8 h-8 mx-auto text-muted-foreground mb-2"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            {t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleTitle')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleBody')}
          </p>
          {emptyStateCta}
        </div>
      </div>
    )
  }

  // ── Not found (the item itself is missing) ────────────────────────────────
  if (!data) {
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
          <p className="text-sm font-medium text-foreground">{t(`${NS}.notFoundTitle`)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t(`${NS}.notFoundBody`)}</p>
          {emptyStateCta}
        </div>
      </div>
    )
  }

  const { item, contexto, traza } = data
  // Finite maps crash on unknown keys — ALWAYS fall back (SalaAgente invariant).
  const sev = SEVERIDAD_TOKEN[item.severidad] ?? SEVERIDAD_TOKEN.media
  const isActionable = ACTIONABLE_ESTADOS.has(item.estado)

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
            {severidadLabel(t, item.severidad)}
          </span>
          <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border bg-muted">
            {estadoLabel(t, item.estado, item.agente)}
          </span>
          {item.flags.map((flag) => {
            // Unknown flags are silently skipped (finite-map fallback).
            const meta = FLAG_META[flag] ?? null
            if (!meta) return null
            const FlagIcon = meta.icon
            return (
              <span
                key={flag}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
              >
                <FlagIcon className="w-3 h-3" aria-hidden="true" />
                {flagLabel(t, flag)}
              </span>
            )
          })}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {relativeTime(item.createdAt, t)}
          </span>
        </div>
      </header>

      {/* 2-col: suggestion + contexto | traza */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {!isActionable ? (
            /* No longer actionable — actions hidden, show the status block */
            <div
              className="rounded-xl border border-border bg-card p-4 space-y-2"
              data-testid="caso-decision"
            >
              <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                {t(`${NS}.decision`)}
              </p>
              <div className="flex items-center gap-2">
                {item.estado === 'rechazado' || item.estado === 'fallo' ? (
                  <XCircle className="w-5 h-5 text-[#C4503B] dark:text-[#E0664D]" weight="duotone" aria-hidden="true" />
                ) : item.estado === 'ejecutando' ? (
                  <Clock className="w-5 h-5 text-muted-foreground" weight="duotone" aria-hidden="true" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" weight="duotone" aria-hidden="true" />
                )}
                <p
                  className={`text-sm font-semibold ${
                    item.estado === 'fallo' ? 'text-[#C4503B] dark:text-[#E0664D]' : 'text-foreground'
                  }`}
                >
                  {estadoLabel(t, item.estado, item.agente)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  item.decidedBy
                    ? t(`${NS}.decididoPor`, { nombre: item.decidedBy })
                    : t(`${NS}.decisionRegistrada`),
                  item.decidedAt ? relativeTime(item.decidedAt, t) : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
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
              className="rounded-xl border border-border bg-card p-4 space-y-2"
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
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition group"
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
          <h2 className="text-sm font-semibold text-foreground">{t(`${NS}.trazaTitle`)}</h2>
          <TrazaCaso entries={traza} agente={item.agente} />
        </aside>
      </div>
    </div>
  )
}
