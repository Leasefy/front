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
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Robot,
  XCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { MigaDePan } from './MigaDePan'

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

  // ← + miga de pan: el botón vuelve a la cola; la miga también permite
  // saltar al hub de agentes (patrón MigaDePan, pedido UX 2026-06-11).
  const backToCola = (
    <MigaDePan
      backHref={colaHref}
      icon={BreadcrumbIcon}
      crumbs={[
        { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
        { label: colaLabel, href: colaHref },
        { label: t(`${NS}.migaCaso`) },
      ]}
    />
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

  // CTA de los empty states (estilo limpio: pill outlined ElevenLabs, único
  // elemento con énfasis): el notFoundAction de la página o, si no llega, el
  // clásico "Volver a la cola". Ambos comparten el mismo pill mudo.
  const EMPTY_CTA_CLS =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-500 hover:shadow-sm active:scale-[0.98] transition-all duration-150'
  const emptyStateCta = notFoundAction ? (
    <Link href={notFoundAction.href} className={EMPTY_CTA_CLS} data-testid="caso-not-found-action">
      {notFoundAction.label}
    </Link>
  ) : (
    <Link href={colaHref} className={EMPTY_CTA_CLS}>
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
          role="status"
          aria-label={t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleTitle')}
          className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
          data-testid="caso-no-disponible"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
            <BreadcrumbIcon
              weight="duotone"
              className="h-6 w-6 text-neutral-400 dark:text-neutral-500"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100">
              {t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleTitle')}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed mx-auto">
              {t('inmobiliaria.ai.workspace.pages.comun.detalleNoDisponibleBody')}
            </p>
          </div>
          <div className="mt-1">{emptyStateCta}</div>
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
          role="status"
          aria-label={t(`${NS}.notFoundTitle`)}
          className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
          data-testid="caso-not-found"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
            <MagnifyingGlass
              weight="duotone"
              className="h-6 w-6 text-neutral-400 dark:text-neutral-500"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100">
              {t(`${NS}.notFoundTitle`)}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed mx-auto">
              {t(`${NS}.notFoundBody`)}
            </p>
          </div>
          <div className="mt-1">{emptyStateCta}</div>
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
