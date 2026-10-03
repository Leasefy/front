'use client'

/**
 * PauseModal — Phase 31 plan 31-09 (D-31-01).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/pause with
 * { paused_until, reason }. Backend gates on cobranza:intervene.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'
import { Pause, Play } from '@phosphor-icons/react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { erroresDeLaIntervencion, errorDelMotivo } from './error-de-la-intervencion'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface PauseModalProps {
  /**
   * `reanudar` manda `paused_until: null`, que es como el agente entiende
   * «vuelve a trabajar este caso». Es la MISMA puerta que pausar —mismo
   * endpoint, mismo permiso, mismo motivo obligatorio— porque las dos son la
   * misma decisión y las dos tienen que quedar en la bitácora.
   */
  modo?: 'pausar' | 'reanudar'
  open: boolean
  onClose: () => void
  debtorId: string
  debtorName: string
  onSuccess: () => void
}

function defaultPausedUntil(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function PauseModal({
  modo = 'pausar',
  open,
  onClose,
  debtorId,
  onSuccess,
}: PauseModalProps) {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [pausedUntil, setPausedUntil] = useState<string>(defaultPausedUntil())
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  /** El error de cada campo: el del cliente (el motivo) o el que mandó el micro en `campos`. */
  const [errores, setErrores] = useState<Partial<Record<'reason' | 'paused_until', string>>>({})

  useEffect(() => {
    if (open) {
      setPausedUntil(defaultPausedUntil())
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
    // Antes: «Min 5 characters», en inglés y lejos del campo.
    const delMotivo = errorDelMotivo(reason, 5)
    if (delMotivo) {
      setErrores({ reason: delMotivo })
      document.getElementById('pausa-motivo')?.focus()
      return
    }
    setSubmitting(true)
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/pause`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            paused_until:
              modo === 'reanudar'
                ? null
                : new Date(pausedUntil + 'T00:00:00').toISOString(),
            reason: reason.trim(),
          }),
        },
      )
      if (!res.ok) throw await falloDelMicro(res)
      onSuccess()
      onClose()
    } catch (err) {
      // Antes: el status crudo («500»). Un `fetch` que no salió llega tal cual
      // (el traductor dice «conexión»).
      const reanudar = modo === 'reanudar'
      const r = erroresDeLaIntervencion<'reason' | 'paused_until'>(err, {
        campos: ['reason', 'paused_until'],
        porDefecto: reanudar ? 'No pudimos reanudar la cobranza.' : 'No pudimos pausar la cobranza.',
        accion: reanudar ? 'reanudar la cobranza' : 'pausar la cobranza',
      })
      setErrores(r.porCampo)
      setError(r.general)
      if (r.primero) {
        document.getElementById(r.primero === 'reason' ? 'pausa-motivo' : 'pausa-hasta')?.focus()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        size="sm"
        variant="confirm"
        icon={modo === 'reanudar' ? <Play weight="bold" /> : <Pause weight="bold" />}
      >
        <DialogHeader>
          <DialogTitle>
            {t(
              modo === 'reanudar'
                ? 'inmobiliaria.ai.cobranza.detail.acciones.resume.modalTitle'
                : 'inmobiliaria.ai.cobranza.detail.acciones.pause.modalTitle',
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              modo === 'reanudar'
                ? 'inmobiliaria.ai.cobranza.detail.acciones.resume.modalDescription'
                : 'inmobiliaria.ai.cobranza.detail.acciones.pause.modalDescription',
            )}
          </DialogDescription>
        </DialogHeader>

        {envMissing ? (
          <p className="text-sm text-warning">
            {t('inmobiliaria.ai.cobranza.detail.acciones.envMissing')}
          </p>
        ) : (
          <div className="space-y-3">
            {/* Reanudar no tiene «hasta cuándo»: la pausa se levanta y ya. */}
            {modo === 'pausar' && (
              <label className="block">
                <span className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.pause.untilLabel')}
                </span>
                <Input
                  id="pausa-hasta"
                  type="date"
                  value={pausedUntil}
                  onChange={(e) => {
                    setPausedUntil(e.target.value)
                    setErrores(({ paused_until: _, ...resto }) => resto)
                  }}
                  className="mt-1 w-full"
                  aria-invalid={errores.paused_until ? true : undefined}
                  aria-describedby={errores.paused_until ? 'pausa-hasta-error' : undefined}
                />
                <ErrorDelCampo id="pausa-hasta-error" mensaje={errores.paused_until} />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium text-fg-subtle">
                {t('inmobiliaria.ai.cobranza.detail.acciones.pause.reasonLabel')}
              </span>
              <Textarea
                id="pausa-motivo"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setErrores(({ reason: _, ...resto }) => resto)
                }}
                rows={3}
                minLength={5}
                placeholder={t(
                  'inmobiliaria.ai.cobranza.detail.acciones.pause.reasonPlaceholder',
                )}
                className="mt-1 w-full"
                aria-invalid={errores.reason ? true : undefined}
                aria-describedby={errores.reason ? 'pausa-motivo-error' : undefined}
              />
              <ErrorDelCampo id="pausa-motivo-error" mensaje={errores.reason} />
            </label>
          </div>
        )}

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
            disabled={envMissing}
            isLoading={submitting}
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.pause.confirming')
              : t(
                  modo === 'reanudar'
                    ? 'inmobiliaria.ai.cobranza.detail.acciones.resume.confirm'
                    : 'inmobiliaria.ai.cobranza.detail.acciones.pause.confirm',
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
