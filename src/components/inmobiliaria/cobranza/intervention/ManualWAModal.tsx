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

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
          { headers: agentAuthHeaders() },
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
          headers: agentAuthHeaders({ 'content-type': 'application/json' }),
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.modalTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.modalDescription')}
          </DialogDescription>
        </DialogHeader>

        {envMissing ? (
          <p className="text-sm text-warning">
            {t('inmobiliaria.ai.cobranza.detail.acciones.envMissing')}
          </p>
        ) : templatesLoading ? (
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.loadingTemplates')}
          </p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.noTemplates')}
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-fg-subtle">
                {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.templateLabel')}
              </span>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div>
                <p className="text-xs font-medium text-fg-subtle mb-1">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.variablesLabel')}
                </p>
                <div className="space-y-2">
                  {selectedTemplate.variables.map((v) => (
                    <label key={v} className="block">
                      <span className="text-[11px] text-fg-subtle font-mono">
                        {v}
                      </span>
                      <Input
                        type="text"
                        value={variables[v] ?? ''}
                        onChange={(e) =>
                          setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        className="mt-0.5 w-full"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
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
            disabled={submitting || envMissing || templates.length === 0}
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.confirming')
              : t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
