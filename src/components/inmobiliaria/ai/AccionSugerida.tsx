'use client'

/**
 * AccionSugerida — F6 of the Agent Workspace initiative (AGENT-WORKSPACE-SPEC §1.4).
 *
 * The "El agente propone" card for the work-item detail page: suggestion label
 * + confianza badge + razón + evidencia rows + the real backend actions.
 *
 * The requiresReason inline-textarea flow and the busy/toast semantics mirror
 * ColaHumana's WorkItemCard 1:1 (button styling is shared via the exported
 * ACTION_KIND_CLS map). The card-internal markup is intentionally NOT
 * extracted from ColaHumana to avoid destabilizing the F1–F5 queue surfaces —
 * the styling vocabulary is the shared piece.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Sparkle, XCircle } from '@phosphor-icons/react'

import type {
  AccionSugerida as AccionSugeridaModel,
  WorkItemAction,
} from '@/lib/api/work-item'
import { ACTION_KIND_CLS } from './ColaHumana'

export interface AccionSugeridaProps {
  accion: AccionSugeridaModel
  actions: WorkItemAction[]
  /** Posts the action's body to its endpoint; returns ok/error for toasting. */
  onAction: (
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  disabled?: boolean
}

export function AccionSugerida({ accion, actions, onAction, disabled }: AccionSugeridaProps) {
  const [reasonForActionId, setReasonForActionId] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  async function run(action: WorkItemAction, body?: Record<string, unknown>) {
    setBusyActionId(action.id)
    const res = await onAction(action, body)
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

  const pendingReasonAction = actions.find((a) => a.id === reasonForActionId)

  return (
    <div
      className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3"
      data-testid="accion-sugerida"
    >
      {/* Eyebrow */}
      <p className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
        <Sparkle className="w-3.5 h-3.5" weight="duotone" aria-hidden="true" />
        El agente propone
      </p>

      {/* Suggestion */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{accion.label}</p>
          {typeof accion.confianza === 'number' && (
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
              {Math.round(accion.confianza * 100)}% conf.
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{accion.razon}</p>
        {accion.evidencia && accion.evidencia.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
            {accion.evidencia.map((e, i) => (
              <div key={`${e.label}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
                <dt className="text-[11px] text-muted-foreground">{e.label}</dt>
                <dd className="text-[11px] font-medium text-foreground tabular-nums">{e.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Reason input (revealed by a requiresReason action) */}
      {pendingReasonAction && (
        <div className="space-y-1.5 rounded-lg border border-border p-2">
          <label className="text-[11px] text-muted-foreground" htmlFor="accion-sugerida-reason">
            Motivo para {pendingReasonAction.label.toLowerCase()}
          </label>
          <textarea
            id="accion-sugerida-reason"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={2}
            className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Escribe el motivo…"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                disabled ||
                reasonText.trim().length === 0 ||
                busyActionId === pendingReasonAction.id
              }
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
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={disabled || busyActionId === action.id}
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
