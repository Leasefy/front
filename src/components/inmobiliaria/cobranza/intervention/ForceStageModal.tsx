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
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import {
  erroresDeLaIntervencion,
  LARGO_MAXIMO_DEL_MOTIVO,
} from './error-de-la-intervencion'
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
import { Collapse, CrossFade, Presence } from '@leasefy/cadence'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'

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
  // La consecuencia sigue diciendo la última etapa mientras se pliega.
  const targetVisible = useUltimoPresente(target || null)
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  /** El error de cada campo: el del cliente o el que mandó el micro en `campos`. */
  const [errores, setErrores] = useState<Partial<Record<'target_stage' | 'reason', string>>>({})

  useEffect(() => {
    if (open) {
      setTarget('')
      setReason('')
      setError(null)
      setErrores({})
    }
  }, [open])

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const envMissing = !agentUrl || !agencyId

  const handleSubmit = async () => {
    setError(null)
    setErrores({})
    if (envMissing) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.envMissing'))
      return
    }
    // Lo que falta se dice debajo de su campo (antes, todo en una línea suelta).
    const delCliente: Partial<Record<'target_stage' | 'reason', string>> = {}
    if (!target) {
      delCliente.target_stage = t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.targetMissing')
    }
    if (reason.trim().length < 10) {
      delCliente.reason = t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonTooShort')
    } else if (reason.trim().length > LARGO_MAXIMO_DEL_MOTIVO) {
      delCliente.reason = `El motivo puede tener hasta ${LARGO_MAXIMO_DEL_MOTIVO} caracteres.`
    }
    if (delCliente.target_stage || delCliente.reason) {
      setErrores(delCliente)
      document
        .getElementById(delCliente.target_stage ? 'forzar-etapa-destino' : 'forzar-etapa-motivo')
        ?.focus()
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
      if (!res.ok) throw await falloDelMicro(res)
      onSuccess()
      onClose()
    } catch (err) {
      // Antes: el status crudo («500»), o «Acción fallida — intenta de nuevo».
      const r = erroresDeLaIntervencion<'target_stage' | 'reason'>(err, {
        campos: ['target_stage', 'reason'],
        porDefecto: 'No pudimos cambiar la etapa.',
        accion: 'cambiar la etapa',
      })
      setErrores(r.porCampo)
      setError(r.general)
      if (r.primero) {
        document
          .getElementById(r.primero === 'target_stage' ? 'forzar-etapa-destino' : 'forzar-etapa-motivo')
          ?.focus()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      {/* Sin permiso, el medallón ámbar dice que no se puede (antes, la
          descripción en rojo a mano). */}
      <DialogContent size="sm" variant={allowed ? undefined : 'warning'}>
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.modalTitle')}
          </DialogTitle>
          {allowed ? (
            <DialogDescription>
              {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.modalDescription')}
            </DialogDescription>
          ) : (
            <DialogDescription>
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
              <div className="rounded-[14px] border border-border px-3 py-2.5">
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
                  onValueChange={(v) => {
                    setTarget(v as CarteraStage)
                    setErrores(({ target_stage: _, ...resto }) => resto)
                  }}
                >
                  <SelectTrigger
                    id="forzar-etapa-destino"
                    className="mt-1 w-full"
                    aria-invalid={errores.target_stage ? true : undefined}
                    aria-describedby={errores.target_stage ? 'forzar-etapa-destino-error' : undefined}
                  >
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
                <ErrorDelCampo id="forzar-etapa-destino-error" mensaje={errores.target_stage} />
              </label>

              {/* La consecuencia, en la misma pantalla donde se decide. Cambiar
                  de etapa no es reetiquetar: cambia a quién contacta el agente,
                  cuándo, y si sigue haciéndolo. Sólo aparece cuando ya hay un
                  destino elegido — antes no hay nada verdadero que decir. */}
              {/* Se despliega con su altura al elegir el destino, y la frase
                  se cruza al cambiarlo. */}
              <Collapse open={Boolean(target)}>
              {targetVisible && (
                <div className="rounded-md border border-primary/25 bg-primary-soft px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                    {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.effectLabel')}
                  </p>
                  <CrossFade as="p" swapKey={targetVisible} mode="popLayout" direction="none" className="mt-1 text-xs leading-relaxed text-fg">
                    {stageAgentPlan(targetVisible, locale)}
                  </CrossFade>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-fg-muted">
                    {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.effectNote')}
                  </p>
                </div>
              )}
              </Collapse>

              <label className="block">
                <span className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonLabel')}
                </span>
                <Textarea
                  id="forzar-etapa-motivo"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setErrores(({ reason: _, ...resto }) => resto)
                  }}
                  rows={4}
                  minLength={10}
                  placeholder={t(
                    'inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonPlaceholder',
                  )}
                  className="mt-1 w-full"
                  aria-invalid={errores.reason ? true : undefined}
                  aria-describedby={errores.reason ? 'forzar-etapa-motivo-error' : undefined}
                />
                <ErrorDelCampo id="forzar-etapa-motivo-error" mensaje={errores.reason} />
              </label>
            </div>
          ))}

        <Presence as="p" show={Boolean(error)} role="alert" className="text-xs text-danger" data-testid="intervencion-error">
            {error}
        </Presence>

        <DialogFooter>
          <Button
            variant="outline"
            hideArrow
            onClick={onClose}
            disabled={submitting}
          >
            {t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
          </Button>
          <Button
            hideArrow
            onClick={() => void handleSubmit()}
            disabled={envMissing || !allowed || !target}
            isLoading={submitting}
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
