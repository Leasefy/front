'use client'

/**
 * ManualWAModal — Phase 31 plan 31-09 (D-31-03).
 *
 * Template picker over agency's approved WA templates (fetches
 * /api/agency/:agencyId/cobranza/wa-templates). Variables auto-filled
 * from a prefill prop; operator can override. POSTs to
 * /api/agency/:agencyId/cobranza/debtors/:debtorId/wa-send.
 */

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'

void React

interface ManualWAModalProps {
  open: boolean
  onClose: () => void
  debtorId: string
  debtorName: string
  prefill: Record<string, string>
  onSuccess: () => void
}

interface WATemplate {
  id: string
  label: string
  variables: string[]
}

export function ManualWAModal({ open, onClose, debtorId, prefill, onSuccess }: ManualWAModalProps) {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [templates, setTemplates] = useState<WATemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const envMissing = !agentUrl || !agencyId

  // Fetch templates when modal opens
  useEffect(() => {
    if (!open) return
    if (envMissing) return
    let cancelled = false
    setTemplatesLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/wa-templates`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error(`${res.status}`)
        const json = (await res.json()) as { templates: WATemplate[] }
        if (cancelled) return
        setTemplates(json.templates ?? [])
        if (json.templates?.[0]) setSelectedId(json.templates[0].id)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load templates')
      } finally {
        if (!cancelled) setTemplatesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, envMissing, agentUrl, agencyId])

  const selectedTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedId) ?? null,
    [templates, selectedId],
  )

  // Reset vars whenever selection changes — auto-fill from prefill.
  useEffect(() => {
    if (!selectedTemplate) {
      setVariables({})
      return
    }
    const next: Record<string, string> = {}
    for (const v of selectedTemplate.variables) {
      next[v] = prefill[v] ?? ''
    }
    setVariables(next)
  }, [selectedTemplate, prefill])

  if (!open) return null

  const handleSubmit = async () => {
    setError(null)
    if (envMissing) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.envMissing'))
      return
    }
    if (!selectedId) {
      setError('No template selected')
      return
    }
    setSubmitting(true)
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/wa-send`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ template_id: selectedId, variables }),
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
      aria-labelledby="wa-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-xl p-6">
        <h2 id="wa-title" className="text-base font-semibold text-neutral-900 dark:text-white">
          {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.modalTitle')}
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.modalDescription')}
        </p>

        {envMissing ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            {t('inmobiliaria.ai.cobranza.detail.acciones.envMissing')}
          </p>
        ) : templatesLoading ? (
          <p className="mt-3 text-sm text-neutral-500">
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.loadingTemplates')}
          </p>
        ) : templates.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.noTemplates')}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.templateLabel')}
              </span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.variablesLabel')}
                </p>
                <div className="space-y-2">
                  {selectedTemplate.variables.map((v) => (
                    <label key={v} className="block">
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                        {v}
                      </span>
                      <input
                        type="text"
                        value={variables[v] ?? ''}
                        onChange={(e) =>
                          setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        className="mt-0.5 w-full px-2 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || envMissing || templates.length === 0}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.confirming')
              : t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
