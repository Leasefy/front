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
import { toast } from '@/components/ui/toast'
import { CheckCircle, Sparkle, XCircle } from '@phosphor-icons/react'
import { Collapse, MonoLabel } from '@leasefy/cadence'

import type {
  AccionSugerida as AccionSugeridaModel,
  WorkItemAction,
} from '@/lib/api/work-item'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import { ACTION_KIND_VARIANT } from './ColaHumana'
import { repartirFalloDeLaAccion } from './fallo-de-la-accion'
import { tieneCampos } from './campos-de-la-accion'
import { FormularioDeLaAccion } from './FormularioDeLaAccion'

const WORKSPACE_NS = 'inmobiliaria.ai.workspace'

export interface AccionSugeridaProps {
  accion: AccionSugeridaModel
  actions: WorkItemAction[]
  /**
   * Posts the action's body to its endpoint. `fallo` es el error entero para
   * el traductor (`error` es el código viejo y no se muestra).
   */
  onAction: (
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string; fallo?: unknown }>
  disabled?: boolean
}

export function AccionSugerida({ accion, actions, onAction, disabled }: AccionSugeridaProps) {
  const { t } = useI18n()
  const [reasonForActionId, setReasonForActionId] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  /** Lo que el micro dijo del motivo (un 400 con `campos`): va debajo del campo. */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null)
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  /** Manda la acción; si sale bien, avisa y cierra el panel. Devuelve lo que dijo el micro. */
  async function ejecutar(action: WorkItemAction, body?: Record<string, unknown>) {
    setBusyActionId(action.id)
    const res = await onAction(action, body)
    setBusyActionId(null)
    if (res.ok) {
      toast.success(t(`${WORKSPACE_NS}.acciones.toastOk`, { label: action.label }))
      setReasonForActionId(null)
      setReasonText('')
      setErrorDelMotivo(null)
    }
    return res
  }

  /** El flujo de siempre: sin cuerpo, o con el motivo. */
  async function run(action: WorkItemAction, body?: Record<string, unknown>) {
    const res = await ejecutar(action, body)
    if (!res.ok) {
      // Con la regla de oro: el error del motivo a su campo (y el foco ahí);
      // al toast lo demás. Antes: «No se pudo: 403» o el código del micro.
      const { motivo, sueltos } = repartirFalloDeLaAccion(res.fallo, action.label, body?.reason !== undefined)
      setErrorDelMotivo(motivo ?? null)
      if (motivo) document.getElementById('accion-sugerida-reason')?.focus()
      if (sueltos.length > 0) toast.error(sueltos.join(' · '))
    }
  }

  /** La acción pide algo antes de mandarse: sus campos declarados (02-10-2026) o el motivo. */
  const pideAlgo = (action: WorkItemAction) => tieneCampos(action) || Boolean(action.requiresReason)

  function handleClick(action: WorkItemAction) {
    if (pideAlgo(action)) {
      // First click reveals the reason input; submit happens from the panel.
      setReasonForActionId((cur) => (cur === action.id ? null : action.id))
      setErrorDelMotivo(null)
      return
    }
    void run(action)
  }

  const pendingReasonAction = actions.find((a) => a.id === reasonForActionId)
  // Cada panel conserva su última acción mientras se pliega: sin esto, se
  // vaciaba en el mismo cuadro en que empezaba a cerrarse y se encogía en
  // blanco.
  const accionConCampos = useUltimoPresente(
    pendingReasonAction && tieneCampos(pendingReasonAction) ? pendingReasonAction : null,
  )
  const accionSinCampos = useUltimoPresente(
    pendingReasonAction && !tieneCampos(pendingReasonAction) ? pendingReasonAction : null,
  )

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 space-y-3"
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

      {/* Los campos que la acción declara (02-10-2026): «Resolver» pide la
          categoría y el texto de la resolución, no un motivo. */}
      {/* Movimiento: los dos paneles se abren y se cierran con su altura
          (`Collapse`) en vez de aparecer de golpe; el formulario de adentro ya
          no anima su propia entrada. */}
      <Collapse
        open={Boolean(pendingReasonAction && tieneCampos(pendingReasonAction))}
        className="rounded-lg border border-border p-2"
      >
        {accionConCampos && (
          <FormularioDeLaAccion
            key={accionConCampos.id}
            idBase={`accion-sugerida-${accionConCampos.id}`}
            action={accionConCampos}
            onEnviar={(cuerpo) => ejecutar(accionConCampos, cuerpo)}
            onCancelar={() => setReasonForActionId(null)}
            deshabilitado={disabled || (busyActionId !== null && busyActionId !== accionConCampos.id)}
          />
        )}
      </Collapse>

      {/* Reason input (revealed by a requiresReason action without declared fields) */}
      <Collapse
        open={Boolean(pendingReasonAction && !tieneCampos(pendingReasonAction))}
        className="space-y-1.5 rounded-lg border border-border p-2"
      >
        {accionSinCampos && (
          <>
          <label className="text-[11px] text-muted-foreground" htmlFor="accion-sugerida-reason">
            {t(`${WORKSPACE_NS}.acciones.motivoPara`, {
              accion: accionSinCampos.label.toLowerCase(),
            })}
          </label>
          <Textarea
            id="accion-sugerida-reason"
            value={reasonText}
            onChange={(e) => {
              setReasonText(e.target.value)
              setErrorDelMotivo(null)
            }}
            rows={2}
            className="w-full text-xs resize-none"
            placeholder={t(`${WORKSPACE_NS}.acciones.motivoPlaceholder`)}
            {...(errorDelMotivo
              ? { 'aria-describedby': 'accion-sugerida-reason-error', 'aria-invalid': true as const }
              : {})}
          />
          <ErrorDelCampo id="accion-sugerida-reason-error" mensaje={errorDelMotivo} className="mt-0" />
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
              onClick={() => void run(accionSinCampos, { reason: reasonText.trim() })}
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
                setErrorDelMotivo(null)
              }}
            >
              {t(`${WORKSPACE_NS}.acciones.cancelar`)}
            </Button>
          </div>
          </>
        )}
      </Collapse>

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
              aria-pressed={pideAlgo(action) ? reasonForActionId === action.id : undefined}
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
