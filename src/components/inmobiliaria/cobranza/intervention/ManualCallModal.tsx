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

import { agentFetch } from '@/lib/api/agent-fetch'
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

  useEffect(() => {
    if (open) {
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
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/manual-call`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
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
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.modalTitle')}
          </DialogTitle>
          {allowed ? (
            <DialogDescription>
              {t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.modalDescription')}
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
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.reasonLabel')}
                </span>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  minLength={5}
                  placeholder={t(
                    'inmobiliaria.ai.cobranza.detail.acciones.manualCall.reasonPlaceholder',
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
            disabled={submitting || envMissing || !allowed}
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
