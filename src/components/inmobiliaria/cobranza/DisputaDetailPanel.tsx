'use client'

/**
 * DisputaDetailPanel — columna derecha del maestro-detalle de Disputas.
 *
 * Acá vive lo que hay que LEER (el motivo completo) y lo que hay que HACER
 * (resolver). La resolución estaba en un modal: se abría encima del motivo,
 * justo el texto sobre el que había que decidir. Al pie de un panel que ya
 * muestra el motivo, no tapa nada.
 *
 * T-323: resolver es HUMANO. El backend no reactiva la cobranza — devuelve una
 * recomendación y decide una persona. Esa recomendación antes se pedía y se
 * TIRABA; ahora se muestra.
 */

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Info, Scales } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Badge, Button } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  CobranzaDispute,
  DisputeOutcome,
} from '@/lib/hooks/cobranza/use-disputes'
import {
  DISPUTE_ESTADO,
  asDisputeStatus,
  debtorLabel,
  outcomeLabel,
} from '@/lib/cobranza/dispute-vocab'

const NOTE_MAX = 2000

const OUTCOME_OPCIONES: { value: DisputeOutcome; label: string }[] = [
  { value: 'procedente', label: 'Procedente — la disputa tiene fundamento' },
  { value: 'improcedente', label: 'Improcedente — la disputa no procede' },
  { value: 'parcial', label: 'Parcial — procede en parte' },
]

export interface DisputaDetailPanelProps {
  dispute: CobranzaDispute | null
  onResolve: (
    id: string,
    body: { outcome: DisputeOutcome; resolutionNote: string },
  ) => Promise<{ ok: boolean; status: number; recommendation: string | null }>
}

/** Encabezado de sección, en el registro de etiqueta del DS. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wide text-fg-muted">
      {children}
    </h3>
  )
}

export function DisputaDetailPanel({
  dispute,
  onResolve,
}: DisputaDetailPanelProps) {
  const { formatCurrency, formatDate, formatRelativeDate } = useI18n()

  const [outcome, setOutcome] = useState<DisputeOutcome | ''>('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [recomendacion, setRecomendacion] = useState<string | null>(null)

  // Cambiar de disputa NO puede arrastrar el borrador de otra: una nota de
  // resolución es un acto jurídico y pegarla en la disputa equivocada es peor
  // que perderla.
  useEffect(() => {
    setOutcome('')
    setNote('')
    setSubmitError(null)
    setRecomendacion(null)
  }, [dispute?.id])

  const noteLen = note.trim().length
  const canSubmit =
    dispute !== null && outcome !== '' && noteLen > 0 && noteLen <= NOTE_MAX && !submitting

  const handleSubmit = useCallback(async () => {
    if (!dispute || outcome === '' || !canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const res = await onResolve(dispute.id, {
      outcome,
      resolutionNote: note.trim(),
    })
    setSubmitting(false)
    if (res.ok) {
      setOutcome('')
      setNote('')
      setRecomendacion(res.recommendation)
    } else if (res.status === 403) {
      setSubmitError('No tienes permiso para resolver disputas.')
    } else if (res.status === 404) {
      setSubmitError('La disputa ya no existe.')
    } else if (res.status === 409) {
      setSubmitError('La disputa ya fue resuelta.')
    } else if (res.status === 0) {
      setSubmitError(
        'No se pudo resolver la disputa. El servicio no está disponible.',
      )
    } else {
      setSubmitError(`No se pudo resolver la disputa (error ${res.status}).`)
    }
  }, [dispute, outcome, note, canSubmit, onResolve])

  if (!dispute) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center gap-3">
        <Scales className="w-8 h-8 text-fg-muted" weight="duotone" aria-hidden="true" />
        <p className="text-sm text-fg-muted max-w-xs">
          Elegí una disputa de la lista para leer el motivo y resolverla.
        </p>
      </div>
    )
  }

  const estado = DISPUTE_ESTADO[asDisputeStatus(dispute.status)]
  const resuelta = asDisputeStatus(dispute.status) === 'resolved'
  const resultado = outcomeLabel(dispute)
  const abierta = new Date(dispute.opened_at)

  return (
    <article className="p-5 lg:p-6 space-y-6" data-testid={`disputa-detalle-${dispute.id}`}>
      {/* Quién, en qué estado, desde cuándo */}
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-fg">{debtorLabel(dispute)}</h2>
          <Badge variant={estado.variant} className="shrink-0">
            {estado.label}
          </Badge>
        </div>
        <p className="text-xs text-fg-muted tabular-nums">
          Abierta el{' '}
          {Number.isNaN(abierta.getTime())
            ? '—'
            : formatDate(abierta, { day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {formatRelativeDate(dispute.opened_at)}
        </p>
      </header>

      <section className="space-y-1.5">
        <Rotulo>Motivo</Rotulo>
        <p className="text-sm text-fg leading-relaxed whitespace-pre-line">
          {dispute.reason}
        </p>
      </section>

      <section className="space-y-1.5">
        <Rotulo>Monto en disputa</Rotulo>
        <p className="text-sm text-fg font-mono tabular-nums">
          {dispute.disputed_amount != null
            ? formatCurrency(dispute.disputed_amount)
            : 'No se disputó un monto puntual.'}
        </p>
      </section>

      {/* Ya resuelta: se muestra la decisión, no un formulario */}
      {resuelta ? (
        <section className="space-y-4 border-t border-border pt-5">
          <div className="space-y-1.5">
            <Rotulo>Resultado</Rotulo>
            <p className="text-sm font-medium text-fg">{resultado ?? '—'}</p>
          </div>
          {dispute.resolution_note && (
            <div className="space-y-1.5">
              <Rotulo>Nota de resolución</Rotulo>
              <p className="text-sm text-fg leading-relaxed whitespace-pre-line">
                {dispute.resolution_note}
              </p>
            </div>
          )}
          {dispute.resolved_at && (
            <p className="text-xs text-fg-muted tabular-nums">
              Resuelta {formatRelativeDate(dispute.resolved_at).toLowerCase()}
            </p>
          )}
          {recomendacion && (
            <div className="flex items-start gap-2 rounded-xl bg-surface-muted p-3">
              <Info
                className="w-4 h-4 mt-0.5 shrink-0 text-fg-muted"
                weight="duotone"
                aria-hidden="true"
              />
              <p className="text-xs text-fg-muted leading-relaxed">
                {recomendacion}
              </p>
            </div>
          )}
        </section>
      ) : (
        /* Formulario de resolución — HUMANO (T-323) */
        <section className="space-y-4 border-t border-border pt-5">
          <div className="space-y-1">
            <Rotulo>Resolver</Rotulo>
            <p className="text-xs text-fg-muted leading-relaxed">
              Es una decisión humana. No reactiva la cobranza: el agente sólo
              entrega una recomendación.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="resolver-outcome"
              className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
            >
              Resultado <span className="text-danger">*</span>
            </label>
            <Select
              value={outcome || undefined}
              onValueChange={(v) => setOutcome(v as DisputeOutcome)}
            >
              <SelectTrigger id="resolver-outcome">
                <SelectValue placeholder="Elegí un resultado" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="resolver-note"
              className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
            >
              Nota de resolución <span className="text-danger">*</span>
            </label>
            <Textarea
              id="resolver-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={NOTE_MAX + 50}
              placeholder="Justificá la decisión y los próximos pasos."
              className="leading-relaxed"
            />
            <div className="flex items-center justify-end text-xs text-fg-muted tabular-nums">
              {noteLen} / {NOTE_MAX}
            </div>
          </div>

          {submitError && <p className="text-xs text-danger">{submitError}</p>}

          <Button
            size="sm"
            hideArrow
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-testid="disputa-resolver-submit"
          >
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            {submitting ? 'Resolviendo…' : 'Resolver disputa'}
          </Button>
        </section>
      )}
    </article>
  )
}
