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

  if (!open || !field) return null

  const fieldLabel = FIELD_LABEL_ES[field]

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pii-reveal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-xl p-6">
        <h2
          id="pii-reveal-title"
          className="text-base font-semibold text-neutral-900 dark:text-white"
        >
          {t('inmobiliaria.ai.cobranza.detail.pii.modalTitle')}
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {`Vas a desenmascarar la ${fieldLabel} de ${debtorName || '—'}. ` +
            t('inmobiliaria.ai.cobranza.detail.pii.modalBody')}
        </p>
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          {t('inmobiliaria.ai.cobranza.detail.pii.auditNote')}
        </p>

        {(localError ?? error) && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">
            {localError ?? error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isMinting}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isMinting}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isMinting
              ? t('inmobiliaria.ai.cobranza.detail.pii.modalMinting')
              : t('inmobiliaria.ai.cobranza.detail.pii.modalConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
