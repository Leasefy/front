'use client'

/**
 * ColaHumana — F1 of the Agent Workspace initiative.
 *
 * The transversal "human queue" surface: renders a list of WorkItem[] (any
 * agent) prioritized by severidad, each as a card that surfaces the agent's
 * suggested action + evidence and the real backend actions (Aprobar / Rechazar
 * / …). Generalized from cobranza's EscalationCard (RBAC + claim/assign/resolve
 * kanban) into a prop-driven, agent-agnostic component.
 *
 * Content (titulo, accionSugerida, action labels) is backend-provided Spanish;
 * the chrome labels live under the `inmobiliaria.ai.workspace.*` i18n
 * namespace (extracted from the original inline literals — es output is
 * byte-identical).
 *
 * Styling vocabulary harvested from EscalationCard (mvp:docs/COLOR_SYSTEM.md),
 * mapped to the brand contract tones: danger #C4503B = error/critical,
 * warning #B7791F = attention, success #2C7A53 = ok; theme tokens for chrome.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle,
  XCircle,
  WarningCircle,
  ShieldWarning,
  Hourglass,
  CaretRight,
} from '@phosphor-icons/react'

import type {
  Severidad,
  WorkItem,
  WorkItemAction,
  WorkItemFlag,
} from '@/lib/api/work-item'
import { useI18n } from '@/lib/i18n'
import type { TranslationParams } from '@/lib/i18n'

// ── Vocabulary ──────────────────────────────────────────────────────────────
// Exported (F6): the workspace primitives (SalaAgente, AccionSugerida, the
// detail page) reuse these maps + label helpers so estado/severidad/flag
// chips render identically everywhere. Label TEXT lives in the
// `inmobiliaria.ai.workspace.*` i18n namespace; the helpers take `t` (from
// useI18n) and degrade to the raw backend value when a key is unknown —
// t() echoes the key path on a miss, which we never want to render.

const WORKSPACE_NS = 'inmobiliaria.ai.workspace'

/** Shape of useI18n().t — primitives thread it into the shared helpers. */
export type TranslateFn = (key: string, params?: TranslationParams) => string

/** Vocabulary lookup with raw-value fallback for out-of-contract keys. */
export function workspaceVocab(t: TranslateFn, group: string, key: string): string {
  const full = `${WORKSPACE_NS}.${group}.${key}`
  const label = t(full)
  return label === full ? key : label
}

export const severidadLabel = (t: TranslateFn, sev: string): string =>
  workspaceVocab(t, 'severidad', sev)

/**
 * Estado chip label. When `agente` is provided, the per-agent override
 * `inmobiliaria.ai.workspace.pages.{agente}.estado.{estado}` wins (e.g.
 * cotizador renders its own domain vocabulary); on a t() miss (key echo)
 * it degrades to the generic workspace estado vocabulary.
 */
export const estadoLabel = (t: TranslateFn, estado: string, agente?: string): string => {
  if (agente) {
    const override = `${WORKSPACE_NS}.pages.${agente}.estado.${estado}`
    const label = t(override)
    if (label !== override) return label
  }
  return workspaceVocab(t, 'estado', estado)
}

export const flagLabel = (t: TranslateFn, flag: string): string =>
  workspaceVocab(t, 'flag', flag)

export const SEVERIDAD_TOKEN: Record<Severidad, { bg: string; text: string; ring: string }> = {
  critica: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
    ring: 'ring-[#C4503B]/30 dark:ring-[#C4503B]/40 animate-pulse',
  },
  alta: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
    ring: 'ring-[#C4503B]/30 dark:ring-[#C4503B]/40',
  },
  media: {
    bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
    ring: 'ring-[#B7791F]/30 dark:ring-[#B7791F]/40',
  },
  baja: {
    bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
    ring: 'ring-[#2C7A53]/30 dark:ring-[#2C7A53]/40',
  },
}

const SEVERIDAD_RANK: Record<Severidad, number> = { critica: 3, alta: 2, media: 1, baja: 0 }

/** Flag chip icon + classes; label text resolves via flagLabel(t, flag). */
export const FLAG_META: Record<WorkItemFlag, { icon: typeof WarningCircle; cls: string }> = {
  necesita_humano: {
    icon: WarningCircle,
    cls: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F] ring-[#B7791F]/30 dark:ring-[#B7791F]/40',
  },
  t323: {
    icon: ShieldWarning,
    cls: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D] ring-[#C4503B]/30 dark:ring-[#C4503B]/40',
  },
  en_espera: {
    icon: Hourglass,
    cls: 'bg-muted text-muted-foreground ring-border',
  },
}

export function relativeTime(iso: string, t: TranslateFn): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (deltaSec < 60) return t(`${WORKSPACE_NS}.tiempo.s`, { n: deltaSec })
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return t(`${WORKSPACE_NS}.tiempo.m`, { n: deltaMin })
  const deltaHr = Math.round(deltaMin / 60)
  if (deltaHr < 24) return t(`${WORKSPACE_NS}.tiempo.h`, { n: deltaHr })
  return t(`${WORKSPACE_NS}.tiempo.d`, { n: Math.round(deltaHr / 24) })
}

export const ACTION_KIND_CLS: Record<WorkItemAction['kind'], string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  // Destructive confirm keeps the danger fill + white text (brand exception).
  danger: 'bg-[#C4503B] text-white hover:opacity-90',
  neutral: 'border border-border text-foreground hover:bg-muted',
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface ColaHumanaProps {
  items: WorkItem[]
  isLoading?: boolean
  error?: string | null
  /**
   * Agent id used to resolve per-agent estado overrides
   * (`inmobiliaria.ai.workspace.pages.{agente}.estado.*`) in all estado chips.
   */
  agente?: string
  /** Posts the action's body to its endpoint; returns ok/error for toasting. */
  onAction: (
    item: WorkItem,
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  /** Optional: open the work-item detail. */
  onOpen?: (item: WorkItem) => void
  /** Title for the empty state (defaults to the generic "Cola vacía"). */
  emptyTitle?: string
  /** Copy for the empty state. */
  emptyHint?: string
  /** Optional CTA below the empty-state hint (small primary pill link). */
  emptyAction?: { label: string; href: string }
}

// ── Item card ───────────────────────────────────────────────────────────────

function WorkItemCard({
  item,
  agente,
  onAction,
  onOpen,
}: {
  item: WorkItem
  agente?: string
  onAction: ColaHumanaProps['onAction']
  onOpen?: (item: WorkItem) => void
}) {
  const { t } = useI18n()
  // Finite maps crash on unknown keys — ALWAYS fall back (SalaAgente invariant).
  const sev = SEVERIDAD_TOKEN[item.severidad] ?? SEVERIDAD_TOKEN.media
  const [reasonForActionId, setReasonForActionId] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  async function run(action: WorkItemAction, body?: Record<string, unknown>) {
    setBusyActionId(action.id)
    const res = await onAction(item, action, body)
    setBusyActionId(null)
    if (res.ok) {
      toast.success(t(`${WORKSPACE_NS}.acciones.toastOk`, { label: action.label }))
      setReasonForActionId(null)
      setReasonText('')
    } else {
      toast.error(t(`${WORKSPACE_NS}.acciones.toastFail`, { error: res.error ?? 'error' }))
    }
  }

  function handleClick(action: WorkItemAction) {
    if (action.requiresReason) {
      // First click reveals the reason input; submit happens from the panel.
      setReasonForActionId((cur) => (cur === action.id ? null : action.id))
      return
    }
    void run(action)
  }

  const pendingReasonAction = item.actions.find((a) => a.id === reasonForActionId)

  return (
    <div
      className="rounded-xl border border-border bg-card p-3 space-y-2"
      data-testid={`work-item-${item.id}`}
    >
      {/* Header: severidad + estado + flags + relative time */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
          >
            {severidadLabel(t, item.severidad)}
          </span>
          <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border bg-muted">
            {estadoLabel(t, item.estado, agente)}
          </span>
          {item.flags.map((flag) => {
            // Unknown flags are silently skipped (finite-map fallback).
            const meta = FLAG_META[flag] ?? null
            if (!meta) return null
            const Icon = meta.icon
            return (
              <span
                key={flag}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
                {flagLabel(t, flag)}
              </span>
            )
          })}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {relativeTime(item.createdAt, t)}
        </span>
      </div>

      {/* Body: title + suggested action + evidence */}
      <button
        type="button"
        onClick={() => onOpen?.(item)}
        disabled={!onOpen}
        className="w-full text-left space-y-1.5 focus:outline-none focus:ring-2 focus:ring-primary rounded-md disabled:cursor-default"
        aria-label={t(`${WORKSPACE_NS}.acciones.abrir`, { titulo: item.titulo })}
      >
        <p className="text-sm font-semibold text-foreground flex items-center gap-1">
          {item.titulo}
          {onOpen && <CaretRight className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />}
        </p>

        {/* Suggested action — the heart of "how the agent's suggestion surfaces" */}
        <div className="rounded-lg bg-muted/50 px-2.5 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">{item.accionSugerida.label}</p>
            {typeof item.accionSugerida.confianza === 'number' && (
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                {t(`${WORKSPACE_NS}.acciones.confianza`, {
                  pct: Math.round(item.accionSugerida.confianza * 100),
                })}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {item.accionSugerida.razon}
          </p>
          {item.accionSugerida.evidencia && item.accionSugerida.evidencia.length > 0 && (
            <dl className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5">
              {item.accionSugerida.evidencia.map((e, i) => (
                <div key={`${e.label}-${i}`} className="flex items-center gap-1">
                  <dt className="text-[11px] text-muted-foreground">{e.label}:</dt>
                  <dd className="text-[11px] font-medium text-foreground tabular-nums">{e.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </button>

      {/* Reason input (revealed by a requiresReason action) */}
      {pendingReasonAction && (
        <div className="space-y-1.5 rounded-lg border border-border p-2">
          <label className="text-[11px] text-muted-foreground" htmlFor={`reason-${item.id}`}>
            {t(`${WORKSPACE_NS}.acciones.motivoPara`, {
              accion: pendingReasonAction.label.toLowerCase(),
            })}
          </label>
          <textarea
            id={`reason-${item.id}`}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={2}
            className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder={t(`${WORKSPACE_NS}.acciones.motivoPlaceholder`)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={reasonText.trim().length === 0 || busyActionId !== null}
              onClick={() => void run(pendingReasonAction, { reason: reasonText.trim() })}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#C4503B] text-white hover:opacity-90 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {t(`${WORKSPACE_NS}.acciones.confirmar`)}
            </button>
            <button
              type="button"
              onClick={() => {
                setReasonForActionId(null)
                setReasonText('')
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              {t(`${WORKSPACE_NS}.acciones.cancelar`)}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {item.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={busyActionId !== null}
              aria-pressed={action.requiresReason ? reasonForActionId === action.id : undefined}
              onClick={() => handleClick(action)}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md active:scale-[0.97] transition disabled:opacity-50 ${ACTION_KIND_CLS[action.kind]}`}
            >
              {action.kind === 'primary' && <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {action.kind === 'danger' && <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── List ────────────────────────────────────────────────────────────────────

export function ColaHumana({
  items,
  isLoading,
  error,
  agente,
  onAction,
  onOpen,
  emptyTitle,
  emptyHint,
  emptyAction,
}: ColaHumanaProps) {
  const { t } = useI18n()
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const rank = SEVERIDAD_RANK[b.severidad] - SEVERIDAD_RANK[a.severidad]
        if (rank !== 0) return rank
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [items],
  )

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="cola-humana-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-4 text-sm text-[#C4503B] dark:text-[#E0664D]"
        data-testid="cola-humana-error"
      >
        {t(`${WORKSPACE_NS}.cola.error`, { error })}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
        data-testid="cola-humana-empty"
      >
        <span className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-2">
          <CheckCircle className="w-6 h-6 text-neutral-600 dark:text-neutral-300" weight="duotone" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-foreground">
          {emptyTitle ?? t(`${WORKSPACE_NS}.cola.vacia`)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {emptyHint ?? t(`${WORKSPACE_NS}.cola.vaciaHint`)}
        </p>
        {emptyAction && (
          <Link
            href={emptyAction.href}
            className="inline-flex items-center gap-1 mt-3 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition"
            data-testid="cola-humana-empty-action"
          >
            {emptyAction.label}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="cola-humana">
      {sorted.map((item) => (
        <WorkItemCard key={item.id} item={item} agente={agente} onAction={onAction} onOpen={onOpen} />
      ))}
    </div>
  )
}
