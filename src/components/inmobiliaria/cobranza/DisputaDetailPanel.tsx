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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { mensajeDeLaAccion } from '@/lib/hooks/cobranza/mensaje-de-la-accion'
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

/** El mismo tope del micro (`resolutionNote: z.string().trim().min(1).max(2000)`). */
const NOTE_MAX = 2000

/** Los campos de resolver, con el nombre que usa el micro en `campos`. */
type CampoDeResolver = 'outcome' | 'resolutionNote'
const ID_DEL_CAMPO_DE_RESOLVER: Record<CampoDeResolver, string> = {
  outcome: 'resolver-outcome',
  resolutionNote: 'resolver-note',
}
const CAMPOS_DE_RESOLVER = Object.keys(ID_DEL_CAMPO_DE_RESOLVER) as CampoDeResolver[]

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
  ) => Promise<{
    ok: boolean
    status: number
    recommendation: string | null
    /** El `ApiError` del micro o el error de la red (ver `use-disputes`). */
    fallo?: unknown
    /** Un código del hook cuando la acción ni salió. */
    error?: string
  }>
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
  /** El error de cada campo que mandó el micro en `campos` (un 400). */
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<CampoDeResolver, string>>
  >({})
  const [recomendacion, setRecomendacion] = useState<string | null>(null)

  // Cambiar de disputa NO puede arrastrar el borrador de otra: una nota de
  // resolución es un acto jurídico y pegarla en la disputa equivocada es peor
  // que perderla.
  useEffect(() => {
    setOutcome('')
    setNote('')
    setSubmitError(null)
    setErroresDelServidor({})
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
    setErroresDelServidor({})
    if (res.ok) {
      setOutcome('')
      setNote('')
      setRecomendacion(res.recommendation)
    } else if (res.status === 403) {
      // El 403 del micro no trae un `message` para la persona: se dice acá.
      setSubmitError('No tienes permiso para resolver disputas.')
    } else if (res.status === 404) {
      setSubmitError('La disputa ya no existe.')
    } else if (res.fallo === undefined) {
      // La acción ni salió (sin agente configurado).
      setSubmitError(
        mensajeDeLaAccion(res, {
          porDefecto: 'No pudimos resolver la disputa.',
          accion: 'resolver la disputa',
        }),
      )
    } else {
      // Un 400 con `campos` va a su campo; un 409 dice su `message` (o que ya
      // estaba resuelta); un 5xx, «de nuestro lado» con la referencia; la red,
      // la conexión. Antes: «error 500» o «el servicio no está disponible».
      const reparto = repartirErroresDelServidor<CampoDeResolver>(res.fallo, {
        campos: CAMPOS_DE_RESOLVER,
        porDefecto:
          res.status === 409 ? 'La disputa ya fue resuelta.' : 'No pudimos resolver la disputa.',
        accion: 'resolver la disputa',
      })
      setErroresDelServidor(reparto.porCampo)
      const primero = CAMPOS_DE_RESOLVER.find((c) => reparto.porCampo[c])
      if (primero) document.getElementById(ID_DEL_CAMPO_DE_RESOLVER[primero])?.focus()
      setSubmitError(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null)
    }
  }, [dispute, outcome, note, canSubmit, onResolve])

  const errorDeLaNota =
    noteLen > NOTE_MAX
      ? `La nota puede tener hasta ${NOTE_MAX.toLocaleString('es-CO')} caracteres.`
      : erroresDelServidor.resolutionNote

  if (!dispute) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center gap-3">
        <Scales className="w-8 h-8 text-fg-muted" weight="duotone" aria-hidden="true" />
        <p className="text-sm text-fg-muted max-w-xs">
          Elige una disputa de la lista para leer el motivo y resolverla.
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
            <div className="flex items-start gap-2 rounded-lg bg-surface-muted p-3">
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
              onValueChange={(v) => {
                setOutcome(v as DisputeOutcome)
                setErroresDelServidor(({ outcome: _, ...resto }) => resto)
              }}
            >
              <SelectTrigger
                id="resolver-outcome"
                aria-invalid={erroresDelServidor.outcome ? true : undefined}
                aria-describedby={erroresDelServidor.outcome ? 'resolver-outcome-error' : undefined}
              >
                <SelectValue placeholder="Elige un resultado" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorDelCampo id="resolver-outcome-error" mensaje={erroresDelServidor.outcome} />
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
              onChange={(e) => {
                setNote(e.target.value)
                setErroresDelServidor(({ resolutionNote: _, ...resto }) => resto)
              }}
              rows={4}
              maxLength={NOTE_MAX + 50}
              placeholder="Justifica la decisión y los próximos pasos."
              className="leading-relaxed"
              aria-invalid={errorDeLaNota ? true : undefined}
              aria-describedby={errorDeLaNota ? 'resolver-note-error' : undefined}
            />
            <div className="flex items-start justify-between gap-3">
              <ErrorDelCampo id="resolver-note-error" mensaje={errorDeLaNota} className="mt-0" />
              <span className="ml-auto shrink-0 text-xs text-fg-muted tabular-nums">
                {noteLen} / {NOTE_MAX}
              </span>
            </div>
          </div>

          {submitError && (
            <p role="alert" className="text-xs text-danger" data-testid="disputa-resolver-error">
              {submitError}
            </p>
          )}

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
