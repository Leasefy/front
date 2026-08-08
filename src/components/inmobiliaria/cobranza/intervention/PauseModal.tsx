'use client'

/**
 * PauseModal — Phase 31 plan 31-09 (D-31-01).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/pause with
 * { paused_until, reason }. Backend gates on cobranza:intervene.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'
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

void React

interface PauseModalProps {
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

export function PauseModal({ open, onClose, debtorId, onSuccess }: PauseModalProps) {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [pausedUntil, setPausedUntil] = useState<string>(defaultPausedUntil())
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPausedUntil(defaultPausedUntil())
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
    if (reason.trim().length < 5) {
      setError('Min 5 characters')
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
            paused_until: new Date(pausedUntil + 'T00:00:00').toISOString(),
            reason: reason.trim(),
          }),
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
            {t('inmobiliaria.ai.cobranza.detail.acciones.pause.modalTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.ai.cobranza.detail.acciones.pause.modalDescription')}
          </DialogDescription>
        </DialogHeader>

        {envMissing ? (
          <p className="text-sm text-warning">
            {t('inmobiliaria.ai.cobranza.detail.acciones.envMissing')}
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-fg-subtle">
                {t('inmobiliaria.ai.cobranza.detail.acciones.pause.untilLabel')}
              </span>
              <Input
                type="date"
                value={pausedUntil}
                onChange={(e) => setPausedUntil(e.target.value)}
                className="mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-fg-subtle">
                {t('inmobiliaria.ai.cobranza.detail.acciones.pause.reasonLabel')}
              </span>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                minLength={5}
                placeholder={t(
                  'inmobiliaria.ai.cobranza.detail.acciones.pause.reasonPlaceholder',
                )}
                className="mt-1 w-full"
              />
            </label>
          </div>
        )}

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
            disabled={submitting || envMissing}
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.pause.confirming')
              : t('inmobiliaria.ai.cobranza.detail.acciones.pause.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
