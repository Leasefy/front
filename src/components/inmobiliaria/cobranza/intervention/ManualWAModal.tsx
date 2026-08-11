'use client'

/**
 * ManualWAModal — Phase 31 plan 31-09 (D-31-03).
 *
 * Elige una plantilla aprobada (GET …/cobranza/wa-templates) y la envía
 * (POST …/cobranza/debtors/:debtorId/wa-send).
 *
 * ── Antes no se entendía nada ──────────────────────────────────────────────
 *
 * El modal mostraba el id crudo de la plantilla (`reminder_soft_co`) y cinco
 * cajas VACÍAS rotuladas `debtor_first_name`, `agency_name`, `overdue_month`,
 * `due_date`, `amount_cop`. O sea: se le pedía a un operador que le mandara un
 * mensaje a un deudor real sin haber leído nunca lo que decía, y completando
 * campos cuyo nombre está en inglés y en snake_case.
 *
 * Estaban vacías por un defecto, además: `prefill` llegaba con la clave
 * `nombre`, y ninguna plantilla tiene una variable que se llame así. El `??`
 * de abajo caía a `''` SIEMPRE. Ver `AccionesTab`.
 *
 * Ahora:
 *  - cada campo se rotula con lo que ES (`Nombre del deudor`), usando
 *    `variableHints` del agente;
 *  - se rellena lo que el panel ya sabe, y lo que no se sabe se dice;
 *  - y el mensaje se ve armado, con los huecos marcados, antes de enviarlo.
 *
 * `body` y `variableHints` son OPCIONALES a propósito: un agente anterior a
 * Leasefy/agent#90 no los manda, y ahí el modal degrada al comportamiento
 * viejo en vez de romperse.
 */

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { paths } from '@/lib/api/generated/agent'
import { construirVistaPrevia } from '@/lib/cobranza/wa-preview'
import { construirPrefillWA } from '@/lib/cobranza/wa-prefill'
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
  /**
   * Valores que el llamador quiere imponer. Se aplican ENCIMA de lo que el
   * modal ya sabe rellenar solo (nombre del deudor, nombre de la agencia).
   * Opcional: por defecto no hace falta pasar nada.
   */
  prefill?: Record<string, string>
  onSuccess: () => void
}

/**
 * Del contrato generado, no escrito a mano — ver
 * `reference-tipos-generados-del-agente-son-el-contrato`.
 *
 * `body` y `variableHints` se marcan OPCIONALES a propósito: el contrato dice
 * que el agente los manda, pero un despliegue anterior a Leasefy/agent#90 no.
 * El modal degrada (muestra el nombre crudo y esconde la vista previa) en vez
 * de romperse mientras el agente sube.
 */
type WATemplateDelContrato =
  paths['/api/agency/{agencyId}/cobranza/wa-templates']['get']['responses'][200]['content']['application/json']['templates'][number]

type WATemplate = Omit<WATemplateDelContrato, 'body' | 'variableHints'> &
  Partial<Pick<WATemplateDelContrato, 'body' | 'variableHints'>>

export function ManualWAModal({
  open,
  onClose,
  debtorId,
  debtorName,
  prefill,
  onSuccess,
}: ManualWAModalProps) {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  // Lo que el panel puede rellenar solo. Vive acá y no en las dos pantallas
  // que abren el modal porque acá ya están los dos datos —`agency` de la
  // sesión y `debtorName` por prop—, y así no hay dos versiones que se
  // desincronicen.
  const valoresConocidos = useMemo(
    () => ({
      ...construirPrefillWA({ debtorName, agencyName: agency?.name }),
      ...(prefill ?? {}),
    }),
    [debtorName, agency?.name, prefill],
  )

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
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/wa-templates`)
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

  /** `debtor_first_name` → «Nombre del deudor». Vacío si el agente es viejo. */
  const etiquetas = useMemo<Record<string, string>>(() => {
    const mapa: Record<string, string> = {}
    for (const hint of selectedTemplate?.variableHints ?? []) {
      mapa[hint.name] = hint.description
    }
    return mapa
  }, [selectedTemplate])

  const vistaPrevia = useMemo(() => {
    if (!selectedTemplate?.body) return null
    return construirVistaPrevia(
      selectedTemplate.body,
      selectedTemplate.variables,
      variables,
      etiquetas,
    )
  }, [selectedTemplate, variables, etiquetas])

  // Reset vars whenever selection changes — auto-fill from prefill.
  useEffect(() => {
    if (!selectedTemplate) {
      setVariables({})
      return
    }
    const next: Record<string, string> = {}
    for (const v of selectedTemplate.variables) {
      next[v] = valoresConocidos[v] ?? ''
    }
    setVariables(next)
  }, [selectedTemplate, valoresConocidos])

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
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/wa-send`,
        {
          method: 'POST',
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

            {/* La vista previa va ARRIBA de los campos: lo primero que tiene
                que ver quien va a mandar un mensaje es el mensaje. */}
            {vistaPrevia && (
              <div>
                <p className="mb-1 text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.previewLabel')}
                </p>
                <div
                  data-testid="wa-preview"
                  className="whitespace-pre-wrap rounded-md border border-border bg-surface-muted px-3 py-2.5 text-xs leading-relaxed text-fg"
                >
                  {vistaPrevia.texto}
                </div>
                {vistaPrevia.huecos.length > 0 && (
                  <p className="mt-1 text-[11px] text-warning">
                    {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.previewMissing')}
                  </p>
                )}
              </div>
            )}

            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div>
                <p className="text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.variablesLabel')}
                </p>
                <p className="mb-2 mt-0.5 text-[11px] leading-relaxed text-fg-muted">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.variablesHelp')}
                </p>
                <div className="space-y-2.5">
                  {selectedTemplate.variables.map((v) => {
                    const etiqueta = etiquetas[v]
                    const vacio = (variables[v] ?? '').trim().length === 0
                    return (
                      <label key={v} className="block">
                        {/* Qué ES el campo, primero. El nombre técnico queda al
                            lado porque es lo que se ve en la plantilla de Meta
                            y sirve para reportar un problema — pero no es lo
                            que se le pide leer al operador. */}
                        <span className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-fg">
                            {etiqueta ?? v}
                          </span>
                          {etiqueta && (
                            <span className="font-mono text-[10px] text-fg-subtle">{v}</span>
                          )}
                        </span>
                        <Input
                          type="text"
                          value={variables[v] ?? ''}
                          onChange={(e) =>
                            setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                          }
                          placeholder={
                            vacio
                              ? t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.variableEmpty')
                              : undefined
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                    )
                  })}
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
