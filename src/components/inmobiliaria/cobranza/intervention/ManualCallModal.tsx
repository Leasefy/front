'use client'

/**
 * ManualCallModal — Phase 31 plan 31-09 (D-31-04, admin-only).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/manual-call with
 * { reason }. Admin defense-in-depth: parent gates + this modal re-checks.
 * Confirm uses amber accent (high-blast action).
 */

import * as React from 'react'
import { useEffect, useState } from 'react'
import { Phone } from '@phosphor-icons/react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { erroresDeLaIntervencion, errorDelMotivo } from './error-de-la-intervencion'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Presence } from '@leasefy/cadence'

void React

interface ManualCallModalProps {
  open: boolean
  onClose: () => void
  debtorId: string
  debtorName: string
  onSuccess: () => void
}

export function ManualCallModal({
  open,
  onClose,
  debtorId,
  onSuccess,
}: ManualCallModalProps) {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const perms = usePermissionsContextSafe()
  const allowed =
    (perms?.canAccess('cobranza', 'intervene') ?? false) && (perms?.isAdmin ?? false)

  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  /** El error del motivo: el del cliente o el que mandó el micro en `campos`. */
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
      setErrorMotivo(null)
    }
  }, [open])

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const envMissing = !agentUrl || !agencyId

  const handleSubmit = async () => {
    setError(null)
    setErrorMotivo(null)
    if (envMissing) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.envMissing'))
      return
    }
    // Antes: «Min 5 characters», en inglés y lejos del campo.
    const delMotivo = errorDelMotivo(reason, 5)
    if (delMotivo) {
      setErrorMotivo(delMotivo)
      document.getElementById('llamada-manual-motivo')?.focus()
      return
    }
    setSubmitting(true)
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/manual-call`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      )
      if (!res.ok) throw await falloDelMicro(res)
      onSuccess()
      onClose()
    } catch (err) {
      // Antes: el status crudo («409»), aunque el micro explicara la valla
      // (horario de la Ley 2300, opt-out, frecuencia).
      const r = erroresDeLaIntervencion<'reason'>(err, {
        campos: ['reason'],
        porDefecto: 'No pudimos hacer la llamada.',
        accion: 'hacer la llamada',
        noEncontrado: 'No encontramos a este deudor o no tiene un teléfono registrado.',
      })
      setErrorMotivo(r.porCampo.reason ?? null)
      setError(r.general)
      if (r.primero) document.getElementById('llamada-manual-motivo')?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      {/* Confirmación (dispara una llamada); sin permiso, advertencia. */}
      <DialogContent
        size="sm"
        variant={allowed ? 'confirm' : 'warning'}
        icon={allowed ? <Phone weight="bold" /> : undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.modalTitle')}
          </DialogTitle>
          {allowed ? (
            <DialogDescription>
              {t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.modalDescription')}
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
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.reasonLabel')}
                </span>
                <Textarea
                  id="llamada-manual-motivo"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setErrorMotivo(null)
                  }}
                  rows={3}
                  minLength={5}
                  placeholder={t(
                    'inmobiliaria.ai.cobranza.detail.acciones.manualCall.reasonPlaceholder',
                  )}
                  className="mt-1 w-full"
                  aria-invalid={errorMotivo ? true : undefined}
                  aria-describedby={errorMotivo ? 'llamada-manual-motivo-error' : undefined}
                />
                <ErrorDelCampo id="llamada-manual-motivo-error" mensaje={errorMotivo} />
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
            disabled={envMissing || !allowed}
            isLoading={submitting}
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.confirming')
              : t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
