'use client'

/**
 * CallSummaryPanel — lo que el agente entendió de la llamada.
 *
 * El CallSummarizer escribe esto después de cada llamada desde Phase 13:
 * resultado, promesa de pago, dificultad económica, señales de fraude,
 * temas, sentimiento, un digest en español y la objeción que quedó sin
 * resolver. Nada de eso se mostraba en ningún lado — ni la lista ni el
 * detalle lo pedían al microservicio.
 *
 * El orden es deliberado: primero lo que hay que hacer algo con ello (la
 * promesa, la objeción), después el relato, y al final lo descriptivo.
 *
 * Si la llamada no tiene resumen no se monta nada: una tarjeta que sólo
 * puede decir «sin datos» es andamiaje sobre el vacío.
 */

import { Handshake, ShieldWarning, WarningCircle, Quotes } from '@phosphor-icons/react'

import { Badge } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import type { CallAiSummaryDetail } from '@/lib/hooks/cobranza/use-call-detail'
import {
  summaryOutcomeLabel,
  sentimentLabel,
  nextActionLabel,
  fraudFlagLabel,
  paymentChannelLabel,
  outcomeBadgeVariant,
} from '@/lib/cobranza/call-vocab'

interface CallSummaryPanelProps {
  summary: CallAiSummaryDetail
}

function formatPromiseDate(isoDate: string | null): string | null {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CallSummaryPanel({ summary }: CallSummaryPanelProps) {
  if (!summary) return null

  const promesa = summary.paymentPromised
  const fecha = formatPromiseDate(promesa?.dueDate ?? null)
  const canal = paymentChannelLabel(promesa?.channel)

  return (
    <section
      aria-label="Resumen de la llamada"
      className="rounded-lg border border-border bg-surface p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">Qué pasó en la llamada</h2>
        {summary.outcome && (
          <Badge variant={outcomeBadgeVariant(summary.outcome)}>
            {summaryOutcomeLabel(summary.outcome)}
          </Badge>
        )}
      </div>

      {/* Lo accionable primero */}
      {promesa && (
        <div className="rounded-lg bg-success-soft border border-success/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
            <Handshake className="w-4 h-4" aria-hidden="true" />
            Se comprometió a pagar
          </p>
          <p className="mt-1 text-fg">
            {promesa.amountCop != null ? (
              <span className="font-mono tabular-nums text-lg">
                {formatCurrency(promesa.amountCop)}
              </span>
            ) : (
              <span className="text-sm text-fg-muted">Sin monto declarado</span>
            )}
            {fecha && <span className="text-sm text-fg-muted"> · {fecha}</span>}
          </p>
          {canal && <p className="mt-0.5 text-xs text-fg-muted">Por {canal}</p>}
        </div>
      )}

      {summary.unresolvedObjection && (
        <div className="rounded-lg bg-warning-soft border border-warning/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
            <Quotes className="w-4 h-4" weight="fill" aria-hidden="true" />
            Objeción que quedó sin resolver
          </p>
          <p className="mt-1 text-sm text-fg">{summary.unresolvedObjection}</p>
          <p className="mt-1 text-xs text-fg-muted">
            El agente la retoma en el próximo contacto.
          </p>
        </div>
      )}

      {summary.fraudFlags.length > 0 && (
        <div className="rounded-lg bg-danger-soft border border-danger/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
            <ShieldWarning className="w-4 h-4" weight="fill" aria-hidden="true" />
            Señales de fraude
          </p>
          <ul className="mt-1 space-y-0.5">
            {summary.fraudFlags.map((flag) => (
              <li key={flag} className="text-sm text-fg">
                {fraudFlagLabel(flag)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* El relato */}
      {summary.digest && (
        <p className="text-sm leading-relaxed text-fg-muted">{summary.digest}</p>
      )}

      {/* Lo descriptivo */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {summary.sentiment && (
          <div>
            <dt className="text-fg-subtle">Actitud del deudor</dt>
            <dd className="text-fg">{sentimentLabel(summary.sentiment)}</dd>
          </div>
        )}
        {summary.nextActionRecommended && (
          <div>
            <dt className="text-fg-subtle">Siguiente paso sugerido</dt>
            <dd className="text-fg">{nextActionLabel(summary.nextActionRecommended)}</dd>
          </div>
        )}
        {summary.hardshipDetected && (
          <div className="col-span-2">
            <dd className="flex items-center gap-1.5 text-fg">
              <WarningCircle className="w-4 h-4 text-warning" aria-hidden="true" />
              Mencionó una dificultad económica
            </dd>
          </div>
        )}
      </dl>

      {summary.keyTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {summary.keyTopics.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg-muted"
            >
              {topic.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
