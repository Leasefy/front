'use client'

/**
 * PauseModal — Phase 31 plan 31-09 (D-31-01).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/pause with
 * { paused_until, reason }. Backend gates on cobranza:intervene.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'

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

  if (!open) return null

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
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/pause`,
        {
          method: 'POST',
          headers: agentAuthHeaders({ 'content-type': 'application/json' }),
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl p-6">
        <h2 id="pause-title" className="text-base font-semibold text-neutral-900 dark:text-white">
          {t('inmobiliaria.ai.cobranza.detail.acciones.pause.modalTitle')}
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {t('inmobiliaria.ai.cobranza.detail.acciones.pause.modalDescription')}
        </p>

        {envMissing ? (
          <p className="mt-3 text-sm text-warning">
            {t('inmobiliaria.ai.cobranza.detail.acciones.envMissing')}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {t('inmobiliaria.ai.cobranza.detail.acciones.pause.untilLabel')}
              </span>
              <input
                type="date"
                value={pausedUntil}
                onChange={(e) => setPausedUntil(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {t('inmobiliaria.ai.cobranza.detail.acciones.pause.reasonLabel')}
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                minLength={5}
                placeholder={t(
                  'inmobiliaria.ai.cobranza.detail.acciones.pause.reasonPlaceholder',
                )}
                className="mt-1 w-full px-3 py-2 text-sm rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
              />
            </label>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-danger">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium rounded-sm border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || envMissing}
            className="px-3 py-1.5 text-sm font-medium rounded-sm bg-neutral-500 text-white hover:bg-fg-muted disabled:opacity-50"
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.pause.confirming')
              : t('inmobiliaria.ai.cobranza.detail.acciones.pause.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
