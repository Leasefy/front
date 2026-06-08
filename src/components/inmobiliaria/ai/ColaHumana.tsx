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
 * the chrome labels here are inline literals (no new i18n keys for F1).
 *
 * Styling vocabulary harvested from EscalationCard (mvp:docs/COLOR_SYSTEM.md):
 * rose = error/critical, amber = warning, emerald = ok; theme tokens for chrome.
 */

import { useMemo, useState } from 'react'
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
  WorkItemEstado,
  WorkItemFlag,
} from '@/lib/api/work-item'

// ── Vocabulary ──────────────────────────────────────────────────────────────

const SEVERIDAD_TOKEN: Record<Severidad, { bg: string; text: string; ring: string }> = {
  critica: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    ring: 'ring-rose-200 dark:ring-rose-900 animate-pulse',
  },
  alta: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    ring: 'ring-rose-200 dark:ring-rose-900',
  },
  media: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-900',
  },
  baja: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-900',
  },
}

const SEVERIDAD_LABEL: Record<Severidad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

const SEVERIDAD_RANK: Record<Severidad, number> = { critica: 3, alta: 2, media: 1, baja: 0 }

const ESTADO_LABEL: Record<WorkItemEstado, string> = {
  detectado: 'Detectado',
  sugerido: 'Sugerido',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  ejecutando: 'Ejecutando',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
  fallo: 'Falló',
}

const FLAG_META: Record<WorkItemFlag, { label: string; icon: typeof WarningCircle; cls: string }> = {
  necesita_humano: {
    label: 'Necesita humano',
    icon: WarningCircle,
    cls: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-900',
  },
  t323: {
    label: 'Revisión T-323',
    icon: ShieldWarning,
    cls: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 ring-rose-200 dark:ring-rose-900',
  },
  en_espera: {
    label: 'En espera',
    icon: Hourglass,
    cls: 'bg-muted text-muted-foreground ring-border',
  },
}

function relative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (deltaSec < 60) return `hace ${deltaSec}s`
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return `hace ${deltaMin}m`
  const deltaHr = Math.round(deltaMin / 60)
  if (deltaHr < 24) return `hace ${deltaHr}h`
  return `hace ${Math.round(deltaHr / 24)}d`
}

const ACTION_KIND_CLS: Record<WorkItemAction['kind'], string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  danger: 'bg-rose-600 dark:bg-rose-700 text-white hover:opacity-90',
  neutral: 'border border-border text-foreground hover:bg-muted',
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface ColaHumanaProps {
  items: WorkItem[]
  isLoading?: boolean
  error?: string | null
  /** Posts the action's body to its endpoint; returns ok/error for toasting. */
  onAction: (
    item: WorkItem,
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  /** Optional: open the work-item detail. */
  onOpen?: (item: WorkItem) => void
  /** Copy for the empty state. */
  emptyHint?: string
}

// ── Item card ───────────────────────────────────────────────────────────────

function WorkItemCard({
  item,
  onAction,
  onOpen,
}: {
  item: WorkItem
  onAction: ColaHumanaProps['onAction']
  onOpen?: (item: WorkItem) => void
}) {
  const sev = SEVERIDAD_TOKEN[item.severidad]
  const [reasonForActionId, setReasonForActionId] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  async function run(action: WorkItemAction, body?: Record<string, unknown>) {
    setBusyActionId(action.id)
    const res = await onAction(item, action, body)
    setBusyActionId(null)
    if (res.ok) {
      toast.success(`${action.label} · listo`)
      setReasonForActionId(null)
      setReasonText('')
    } else {
      toast.error(`No se pudo: ${res.error ?? 'error'}`)
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
      className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow p-3 space-y-2"
      data-testid={`work-item-${item.id}`}
    >
      {/* Header: severidad + estado + flags + relative time */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
            const Icon = meta.icon
            return (
              <span
                key={flag}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
                {meta.label}
              </span>
            )
          })}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {relative(item.createdAt)}
        </span>
      </div>

      {/* Body: title + suggested action + evidence */}
      <button
        type="button"
        onClick={() => onOpen?.(item)}
        disabled={!onOpen}
        className="w-full text-left space-y-1.5 focus:outline-none focus:ring-2 focus:ring-primary rounded-md disabled:cursor-default"
        aria-label={`Abrir ${item.titulo}`}
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
                {Math.round(item.accionSugerida.confianza * 100)}% conf.
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
            Motivo para {pendingReasonAction.label.toLowerCase()}
          </label>
          <textarea
            id={`reason-${item.id}`}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={2}
            className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Escribe el motivo…"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={reasonText.trim().length === 0 || busyActionId === pendingReasonAction.id}
              onClick={() => void run(pendingReasonAction, { reason: reasonText.trim() })}
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-2.5 py-1 rounded-md bg-rose-600 dark:bg-rose-700 text-white hover:opacity-90 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => {
                setReasonForActionId(null)
                setReasonText('')
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Cancelar
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
              disabled={busyActionId === action.id}
              aria-pressed={action.requiresReason ? reasonForActionId === action.id : undefined}
              onClick={() => handleClick(action)}
              className={`inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-2.5 py-1 rounded-md active:scale-[0.97] transition disabled:opacity-50 ${ACTION_KIND_CLS[action.kind]}`}
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

export function ColaHumana({ items, isLoading, error, onAction, onOpen, emptyHint }: ColaHumanaProps) {
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
        className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-400"
        data-testid="cola-humana-error"
      >
        No se pudo cargar la cola: {error}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
        data-testid="cola-humana-empty"
      >
        <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Cola vacía</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {emptyHint ?? 'No hay casos pendientes de revisión.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="cola-humana">
      {sorted.map((item) => (
        <WorkItemCard key={item.id} item={item} onAction={onAction} onOpen={onOpen} />
      ))}
    </div>
  )
}
