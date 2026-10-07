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
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { erroresDeLaIntervencion } from './error-de-la-intervencion'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
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
import { CrossFade, Presence } from '@leasefy/cadence'

void React

/**
 * 🔴 CB-10 (QA-PAGOS-95 r2, 06-10-2026): lo que el micro frena y la persona
 * puede decidir. Fuera del horario de la Ley 2300 (Nico 05-10: «avisar y dejar
 * mandar») y el tope de frecuencia (como la llamada manual) se preguntan
 * «¿mandarlo igual?»; el opt-out del canal NO: ese se dice y no sale.
 */
type Confirmacion = { campo: 'fueraDelHorarioConfirmado' | 'omitir_tope_de_frecuencia'; pregunta: string }

/** Las variables que la persona dejó vacías (no se manda un mensaje con huecos). */
export function variablesVacias(nombres: readonly string[], valores: Record<string, string>): string[] {
  return nombres.filter((n) => (valores[n] ?? '').trim().length === 0)
}

function confirmacionDelFallo(err: unknown): Confirmacion | null {
  const e = err as { status?: unknown; code?: unknown; detalle?: Record<string, unknown> } | null
  if (!e || e.status !== 409) return null
  const code = typeof e.code === 'string' ? e.code : e.detalle?.code
  const texto = typeof e.detalle?.message === 'string' ? e.detalle.message : typeof e.detalle?.error === 'string' ? e.detalle.error : ''
  if (code === 'FUERA_DEL_HORARIO_DE_LEY') {
    return { campo: 'fueraDelHorarioConfirmado', pregunta: texto || 'Estás fuera del horario de ley; ¿mandarlo igual?' }
  }
  if (code === 'VALLA_FRECUENCIA') {
    return { campo: 'omitir_tope_de_frecuencia', pregunta: texto || 'Este deudor ya recibió un contacto. ¿Mandarlo igual?' }
  }
  return null
}

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
  /** Lo que el micro preguntó («¿mandarlo igual?») y lo ya confirmado en este envío. */
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const [confirmados, setConfirmados] = useState<Record<string, true>>({})

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
        if (!res.ok) throw await falloDelMicro(res)
        const json = (await res.json()) as { templates: WATemplate[] }
        if (cancelled) return
        setTemplates(json.templates ?? [])
        if (json.templates?.[0]) setSelectedId(json.templates[0].id)
      } catch (err) {
        // Antes: «500» o «Failed to load templates».
        if (!cancelled)
          setError(
            mensajeParaLaPersona(err, {
              porDefecto: 'No pudimos cargar las plantillas de WhatsApp.',
              accion: 'cargar las plantillas de WhatsApp',
            }),
          )
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
    setConfirmacion(null)
    setConfirmados({})
  }, [selectedTemplate, valoresConocidos])

  const vacias = selectedTemplate ? variablesVacias(selectedTemplate.variables, variables) : []

  const handleSubmit = async (confirmar?: Confirmacion['campo']) => {
    setError(null)
    if (envMissing) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.envMissing'))
      return
    }
    if (!selectedId) {
      setError('Elige la plantilla que vas a enviar.')
      return
    }
    // CB-10: un mensaje con huecos no sale («Hola , debes $»).
    if (vacias.length > 0) {
      setError('Completa los datos del mensaje antes de enviarlo.')
      return
    }
    const yaConfirmados = confirmar ? { ...confirmados, [confirmar]: true as const } : confirmados
    setConfirmados(yaConfirmados)
    setConfirmacion(null)
    setSubmitting(true)
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/wa-send`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ template_id: selectedId, variables, ...yaConfirmados }),
        },
      )
      if (!res.ok) throw await falloDelMicro(res)
      const ok = (await res.json().catch(() => ({}))) as { simulado?: boolean }
      // CB-10: antes se cerraba sin decir nada. Ahora dice qué pasó, y si en
      // este entorno el WhatsApp es un doble, lo dice también.
      toast.success(
        ok.simulado
          ? 'WhatsApp registrado. En este entorno el envío es simulado: no le llegó a nadie.'
          : `WhatsApp enviado${debtorName ? ` a ${debtorName}` : ''}.`,
      )
      onSuccess()
      onClose()
    } catch (err) {
      const pregunta = confirmacionDelFallo(err)
      if (pregunta && !yaConfirmados[pregunta.campo]) {
        setConfirmacion(pregunta)
        return
      }
      // Antes: el status crudo («409», «502»). Una valla legal dice cuál; un
      // 502 del proveedor, que falló de nuestro lado; la red, la conexión.
      const r = erroresDeLaIntervencion<never>(err, {
        campos: [],
        porDefecto: 'No pudimos enviar el WhatsApp.',
        accion: 'enviar el WhatsApp',
        noEncontrado: 'No encontramos a este deudor o no tiene un teléfono registrado.',
      })
      setError(r.general)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.modalTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.modalDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Cargando plantillas → el formulario (o «no hay plantillas»): cada
            estado entra con su fundido; `popLayout` monta el nuevo ya. */}
        <CrossFade
          mode="popLayout"
          swapKey={envMissing ? 'sin-agente' : templatesLoading ? 'cargando' : templates.length === 0 ? 'sin-plantillas' : 'formulario'}
        >
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
            {/* Otra plantilla, otra vista previa: se cruzan con un fundido. */}
            <CrossFade swapKey={selectedId} mode="popLayout" direction="none">
            {vistaPrevia && (
              <div>
                <p className="mb-1 text-xs font-medium text-fg-subtle">
                  {t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.previewLabel')}
                </p>
                <div
                  data-testid="wa-preview"
                  className="whitespace-pre-wrap rounded-[14px] border border-border bg-surface-hover px-3 py-2.5 text-xs leading-relaxed text-fg"
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
            </CrossFade>

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
        </CrossFade>

        <Presence as="p" show={Boolean(error)} role="alert" className="text-xs text-danger" data-testid="intervencion-error">
            {error}
        </Presence>

        {/* CB-10: lo que el micro pregunta antes de mandar (fuera del horario de
            ley o por encima del tope del día). Nada sale hasta que se confirma. */}
        <Presence as="div" show={Boolean(confirmacion)} role="status" className="space-y-2 rounded-md border border-warning/40 bg-warning-soft p-3 text-xs text-fg" data-testid="wa-confirmar">
          <p>{confirmacion?.pregunta}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" hideArrow onClick={() => setConfirmacion(null)} disabled={submitting}>
              No mandarlo
            </Button>
            <Button size="sm" hideArrow onClick={() => confirmacion && void handleSubmit(confirmacion.campo)} isLoading={submitting} data-testid="wa-mandar-igual">
              Mandarlo igual
            </Button>
          </div>
        </Presence>

        {vacias.length > 0 && !envMissing && templates.length > 0 && (
          <p className="text-[11px] text-warning" data-testid="wa-faltan-datos">
            {vacias.length === 1 ? 'Falta 1 dato del mensaje' : `Faltan ${vacias.length} datos del mensaje`}: complétalo para poder enviarlo.
          </p>
        )}

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
            disabled={envMissing || templates.length === 0 || vacias.length > 0 || confirmacion !== null}
            isLoading={submitting}
            data-testid="wa-enviar"
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
