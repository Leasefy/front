'use client'

/**
 * PIIRevealModal — Phase 31 plan 31-09 (D-31-05/06/07).
 *
 * Confirmation modal that mints a 5-minute PII reveal token via
 * usePIIReveal(). One audit_log row per confirm (D-31-07). On success the
 * caller's onClose runs — the revealed value is read off PIIRevealContext
 * via <Mask rawValue=... countdownSeconds=... />.
 *
 * Per CONTEXT specifics copy:
 *   "Vas a desenmascarar la cédula de [nombre]. Esta acción queda registrada
 *    en el log de auditoría por 5 minutos."
 *   Confirm: "Confirmar — registrar y revelar."
 */

import * as React from 'react'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { usePIIReveal } from '@/lib/hooks/cobranza/use-pii-reveal'
import type { PIIFieldKey } from '@/lib/context/PIIRevealContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

void React

interface PIIRevealModalProps {
  open: boolean
  onClose: () => void
  field: PIIFieldKey | null
  debtorName: string
}

const FIELD_LABEL_ES: Record<PIIFieldKey, string> = {
  cedula: 'cédula',
  phone: 'teléfono',
  email: 'email',
  fiador_cedula: 'cédula del fiador',
}

export function PIIRevealModal({ open, onClose, field, debtorName }: PIIRevealModalProps) {
  const { t } = useI18n()
  // The hook needs a stable field — when modal is closed we still need to
  // give it something. Default to cedula; the mint() only fires while open.
  const effectiveField: PIIFieldKey = field ?? 'cedula'
  const { mint, isMinting, error } = usePIIReveal({ field: effectiveField })
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setLocalError(null)
  }, [open])

  const fieldLabel = field ? FIELD_LABEL_ES[field] : ''

  const handleConfirm = async () => {
    setLocalError(null)
    const ok = await mint()
    if (ok) {
      onClose()
    } else {
      setLocalError(error ?? t('inmobiliaria.ai.cobranza.detail.pii.errorGeneric'))
    }
  }

  return (
    <Dialog
      open={open && field !== null}
      onOpenChange={(o) => { if (!o) onClose() }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.ai.cobranza.detail.pii.modalTitle')}
          </DialogTitle>
          <DialogDescription>
            {`Vas a desenmascarar la ${fieldLabel} de ${debtorName || '—'}. ` +
              t('inmobiliaria.ai.cobranza.detail.pii.modalBody')}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-warning">
          {t('inmobiliaria.ai.cobranza.detail.pii.auditNote')}
        </p>

        {(localError ?? error) && (
          <p className="text-xs text-danger">{localError ?? error}</p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isMinting}
          >
            {t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
          </Button>
          <Button
            size="sm"
            hideArrow
            onClick={() => void handleConfirm()}
            disabled={isMinting}
          >
            {isMinting
              ? t('inmobiliaria.ai.cobranza.detail.pii.modalMinting')
              : t('inmobiliaria.ai.cobranza.detail.pii.modalConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
