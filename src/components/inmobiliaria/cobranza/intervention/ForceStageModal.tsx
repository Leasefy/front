'use client'

/**
 * ForceStageModal — Phase 31 plan 31-09 (D-31-02, admin-only).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/force-stage.
 * Admin defense-in-depth: parent CTA gates on admin role + cobranza:force-stage;
 * this modal re-checks `canAccess('cobranza','force-stage')` and renders the
 * "Acceso denegado" state if false. Confirm uses amber accent.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import {
  CARTERA_STAGES,
  stageAgentPlan,
  stageDayRange,
  stageDisplayName,
  type CarteraStage,
} from '@/lib/cartera'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

void React

interface ForceStageModalProps {
  open: boolean
  onClose: () => void
  debtorId: string
  debtorName: string
  currentStage: CarteraStage
  onSuccess: () => void
}

export function ForceStageModal({
  open,
  onClose,
  debtorId,
  currentStage,
  onSuccess,
}: ForceStageModalProps) {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const perms = usePermissionsContextSafe()
  const allowed = perms?.canAccess('cobranza', 'force-stage') ?? false

  // Sin destino preseleccionado, a propósito.
  //
  // Antes arrancaba en `CARTERA_STAGES.find(s => s !== currentStage)`, o sea
  // SIEMPRE S0 salvo que el caso ya estuviera ahí: el modal proponía solo, y
  // en silencio, devolver a pre-vencimiento un caso con 27 días de mora. Un
  // destino que nadie eligió no es un default, es una afirmación falsa. Acá
  // hay que elegir, y hasta entonces «Confirmar» está apagado.
  const [target, setTarget] = useState<CarteraStage | ''>('')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTarget('')
      setReason('')
      setError(null)
    }
  }, [open])

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const envMissing = !agentUrl || !agencyId

  const handleSubmit = async () => {
    setError(null)
    if (envMissing) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.envMissing'))
      return
    }
    if (!target) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.targetMissing'))
      return
    }
    if (reason.trim().length < 10) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonTooShort'))
      return
    }
    setSubmitting(true)
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/force-stage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target_stage: target, reason: reason.trim() }),
        },
      )
      if (!res.ok) {
        setError(`${res.status}`)
        return
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('inmobiliaria.ai.cobranza.detail.acciones.genericError'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.modalTitle')}
          </DialogTitle>
          {allowed ? (
            <DialogDescription>
              {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.modalDescription')}
            </DialogDescription>
          ) : (
            <DialogDescription className="text-danger">
              {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.accessDenied')}
            </DialogDescription>
          )}
        </DialogHeader>

        {allowed &&
          (envMissing ? (
            <p className="text-sm text-warning">
              {t('inmobiliaria.ai.cobranza.detail.acciones.envMissing')}
            </p>
          ) : (
            <div className="space-y-4">
              {/* De dónde sale. Sin esto el operador elige un destino sin saber
                  desde dónde se mueve — y «S2 → S1» y «S5 → S1» no son lo
                  mismo ni de lejos. */}
              <div className="rounded-md border border-border bg-surface-muted px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.currentLabel')}
                </p>
                <p className="mt-0.5 text-sm font-medium text-fg">
                  {stageDisplayName(currentStage, locale)}
                  <span className="ml-1.5 font-mono text-xs text-fg-subtle">{currentStage}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  {stageAgentPlan(currentStage, locale)}
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.targetLabel')}
                </span>
                <Select
                  value={target}
                  onValueChange={(v) => setTarget(v as CarteraStage)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue
                      placeholder={t(
                        'inmobiliaria.ai.cobranza.detail.acciones.forceStage.targetPlaceholder',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Nombre humano + rango de días. El código («S2») queda
                        como referencia secundaria: es lo que se ve en la tabla
                        y en la auditoría, pero no es lo que se elige. */}
                    {CARTERA_STAGES.filter((s) => s !== currentStage).map((s) => {
                      const rango = stageDayRange(s, locale)
                      return (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-baseline gap-2">
                            <span>{stageDisplayName(s, locale)}</span>
                            <span className="font-mono text-[11px] text-fg-subtle">{s}</span>
                            {rango && (
                              <span className="text-[11px] text-fg-subtle">· {rango}</span>
                            )}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </label>

              {/* La consecuencia, en la misma pantalla donde se decide. Cambiar
                  de etapa no es reetiquetar: cambia a quién contacta el agente,
                  cuándo, y si sigue haciéndolo. Sólo aparece cuando ya hay un
                  destino elegido — antes no hay nada verdadero que decir. */}
              {target && (
                <div className="rounded-md border border-primary/25 bg-primary-soft px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                    {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.effectLabel')}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-fg">
                    {stageAgentPlan(target, locale)}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-fg-muted">
                    {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.effectNote')}
                  </p>
                </div>
              )}

              <label className="block">
                <span className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonLabel')}
                </span>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  minLength={10}
                  placeholder={t(
                    'inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonPlaceholder',
                  )}
                  className="mt-1 w-full"
                />
              </label>
            </div>
          ))}

        {error && <p className="text-xs text-danger">{error}</p>}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            {t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
          </Button>
          <Button
            size="sm"
            hideArrow
            onClick={() => void handleSubmit()}
            disabled={submitting || envMissing || !allowed || !target}
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.confirming')
              : t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
