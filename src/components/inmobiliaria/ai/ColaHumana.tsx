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
 * mapped to the brand contract tones: danger #C0392B = error/critical,
 * warning #A8730F = attention, success #3F8A53 = ok; theme tokens for chrome.
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

import { StatusBadge, type SemanticTone } from '@leasefy/cadence'

import type {
  Severidad,
  WorkItem,
  WorkItemAction,
  WorkItemFlag,
} from '@/lib/api/work-item'
import { useI18n } from '@/lib/i18n'
import type { TranslationParams } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
    bg: 'bg-danger-soft',
    text: 'text-danger',
    ring: 'ring-danger/30 animate-pulse',
  },
  alta: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    ring: 'ring-danger/30',
  },
  media: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    ring: 'ring-warning/30',
  },
  baja: {
    bg: 'bg-success-soft',
    text: 'text-success',
    ring: 'ring-success/30',
  },
}

const SEVERIDAD_RANK: Record<Severidad, number> = { critica: 3, alta: 2, media: 1, baja: 0 }

/** Flag chip icon + classes; label text resolves via flagLabel(t, flag). */
export const FLAG_META: Record<WorkItemFlag, { icon: typeof WarningCircle; cls: string }> = {
  necesita_humano: {
    icon: WarningCircle,
    cls: 'bg-warning-soft text-warning ring-warning/30',
  },
  t323: {
    icon: ShieldWarning,
    cls: 'bg-danger-soft text-danger ring-danger/30',
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

/** Maps a work-item action kind to the Cadence Button variant. */
export const ACTION_KIND_VARIANT: Record<
  WorkItemAction['kind'],
  'default' | 'destructive' | 'outline'
> = {
  primary: 'default',
  danger: 'destructive',
  neutral: 'outline',
}

/** Maps a severidad to a Cadence StatusBadge tone (BRAND-CONTRACT §2). */
export const SEVERIDAD_TONE: Record<Severidad, SemanticTone> = {
  critica: 'critical',
  alta: 'critical',
  media: 'warning',
  baja: 'success',
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
          <StatusBadge
            tone={SEVERIDAD_TONE[item.severidad] ?? 'warning'}
            pulse={item.severidad === 'critica'}
          >
            {severidadLabel(t, item.severidad)}
          </StatusBadge>
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

      {/* Body: title + suggested action + evidence.
          ALLOWLIST: whole-card clickable region (multiline title + suggested-action
          panel + evidence). List-row/whole-card precedent — Button can't host the
          rich multiline body; accessible name supplied via aria-label. */}
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
          <Textarea
            id={`reason-${item.id}`}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={2}
            className="w-full text-xs resize-none"
            placeholder={t(`${WORKSPACE_NS}.acciones.motivoPlaceholder`)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              hideArrow
              disabled={reasonText.trim().length === 0 || busyActionId !== null}
              onClick={() => void run(pendingReasonAction, { reason: reasonText.trim() })}
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {t(`${WORKSPACE_NS}.acciones.confirmar`)}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => {
                setReasonForActionId(null)
                setReasonText('')
              }}
            >
              {t(`${WORKSPACE_NS}.acciones.cancelar`)}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {item.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={ACTION_KIND_VARIANT[action.kind]}
              size="sm"
              hideArrow
              disabled={busyActionId !== null}
              aria-pressed={action.requiresReason ? reasonForActionId === action.id : undefined}
              onClick={() => handleClick(action)}
            >
              {action.kind === 'primary' && <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {action.kind === 'danger' && <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {action.label}
            </Button>
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
        className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        data-testid="cola-humana-error"
      >
        {t(`${WORKSPACE_NS}.cola.error`, { error })}
      </div>
    )
  }

  if (sorted.length === 0) {
    // Empty state limpio y MONOCROMO: chip neutro + ícono mudo + título +
    // hint, y a lo sumo un CTA pill outlined (estilo ElevenLabs).
    const emptyTitleText = emptyTitle ?? t(`${WORKSPACE_NS}.cola.vacia`)
    return (
      <div
        role="status"
        aria-label={emptyTitleText}
        className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
        data-testid="cola-humana-empty"
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-muted">
          <CheckCircle
            weight="duotone"
            className="h-6 w-6 text-fg-subtle"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[15px] font-semibold text-fg">
            {emptyTitleText}
          </p>
          <p className="text-sm text-fg-subtle max-w-sm leading-relaxed mx-auto">
            {emptyHint ?? t(`${WORKSPACE_NS}.cola.vaciaHint`)}
          </p>
        </div>
        {emptyAction && (
          <div className="mt-1">
            <Link
              href={emptyAction.href}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-surface text-fg border border-border hover:border-border-strong hover:shadow-sm active:scale-[0.98] transition-all duration-150"
              data-testid="cola-humana-empty-action"
            >
              {emptyAction.label}
            </Link>
          </div>
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
