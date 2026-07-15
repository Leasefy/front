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
import { MonoLabel } from '@leasefy/cadence'

import type {
  AccionSugerida as AccionSugeridaModel,
  WorkItemAction,
} from '@/lib/api/work-item'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ACTION_KIND_VARIANT } from './ColaHumana'

const WORKSPACE_NS = 'inmobiliaria.ai.workspace'

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
  const { t } = useI18n()
  const [reasonForActionId, setReasonForActionId] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  async function run(action: WorkItemAction, body?: Record<string, unknown>) {
    setBusyActionId(action.id)
    const res = await onAction(action, body)
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

  const pendingReasonAction = actions.find((a) => a.id === reasonForActionId)

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-3"
      data-testid="accion-sugerida"
    >
      {/* Eyebrow */}
      <p className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Sparkle className="w-3.5 h-3.5" weight="duotone" aria-hidden="true" />
        <MonoLabel className="text-current tracking-wide">
          {t(`${WORKSPACE_NS}.accionSugerida.eyebrow`)}
        </MonoLabel>
      </p>

      {/* Suggestion */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{accion.label}</p>
          {typeof accion.confianza === 'number' && (
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
              {t(`${WORKSPACE_NS}.acciones.confianza`, { pct: Math.round(accion.confianza * 100) })}
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
            {t(`${WORKSPACE_NS}.acciones.motivoPara`, {
              accion: pendingReasonAction.label.toLowerCase(),
            })}
          </label>
          <Textarea
            id="accion-sugerida-reason"
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
              disabled={
                disabled ||
                reasonText.trim().length === 0 ||
                busyActionId !== null
              }
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
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={ACTION_KIND_VARIANT[action.kind]}
              size="sm"
              hideArrow
              disabled={disabled || busyActionId !== null}
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
