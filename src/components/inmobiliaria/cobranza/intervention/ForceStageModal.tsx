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

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { CARTERA_STAGES, type CarteraStage } from '@/lib/cartera'
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
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const perms = usePermissionsContextSafe()
  const allowed = perms?.canAccess('cobranza', 'force-stage') ?? false

  const initialTarget = CARTERA_STAGES.find((s) => s !== currentStage) ?? 'S0'

  const [target, setTarget] = useState<CarteraStage>(initialTarget)
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTarget(initialTarget)
      setReason('')
      setError(null)
    }
  }, [open, initialTarget])

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const envMissing = !agentUrl || !agencyId

  const handleSubmit = async () => {
    setError(null)
    if (envMissing) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.envMissing'))
      return
    }
    if (reason.trim().length < 10) {
      setError('Min 10 characters')
      return
    }
    setSubmitting(true)
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/force-stage`,
        {
          method: 'POST',
          headers: agentAuthHeaders({ 'content-type': 'application/json' }),
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
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.targetLabel')}
                </span>
                <Select
                  value={target}
                  onValueChange={(v) => setTarget(v as CarteraStage)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARTERA_STAGES.filter((s) => s !== currentStage).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
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
            disabled={submitting || envMissing || !allowed}
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
