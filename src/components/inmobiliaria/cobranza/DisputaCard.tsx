'use client'

/**
 * DisputaCard — tarjeta de UNA controversia (disputa) de cobranza (visión #12).
 *
 * Expone, por cada disputa: {deudor (id enmascarado), motivo, monto disputado,
 * estado open/in_review/resolved con tono token, acción}. La acción de resolver
 * es HUMANO-only (T-323): abre el modal de resolución; el card no resuelve nada
 * por sí mismo. Las disputas ya resueltas muestran su outcome en lugar de acción.
 *
 * FUENTE: GET /api/agency/:id/cobranza/disputes (useDisputes). El endpoint une el
 * nombre del deudor dentro del tenant scope (`debtor_name`). Cuando falta —deudor
 * borrado, join sin resolver— se cae a un identificador corto enmascarado; NUNCA
 * se inventa un nombre.
 *
 * Antes esta tarjeta sólo tenía el UUID y mostraba «Deudor ••A3F2C1»: honesto,
 * pero ilegible para un operador que necesita saber QUIÉN disputa. El nombre no es
 * exposición extra — la lista de deudores ya lo devuelve en claro a los mismos
 * roles.
 *
 * Estilo: contrato DS 2026-06-16 — rounded-xl border-border bg-card, tonos
 * semánticos por token (warning/primary/success + *-soft), sin hex.
 */

import * as React from 'react'
import {
  ClockCounterClockwise,
  CurrencyDollar,
  ShieldWarning,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import type {
  CobranzaDispute,
  DisputeStatus,
} from '@/lib/hooks/cobranza/use-disputes'

// ── Tono por estado — tokens DS (sin hex inline) ─────────────────────────────

export const DISPUTE_ESTADO_TOKEN: Record<
  DisputeStatus,
  { bg: string; text: string; ring: string; label: string }
> = {
  open: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    ring: 'ring-warning/30',
    label: 'Abierta',
  },
  in_review: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    ring: 'ring-primary/30',
    label: 'En revisión',
  },
  resolved: {
    bg: 'bg-success-soft',
    text: 'text-success',
    ring: 'ring-success/30',
    label: 'Resuelta',
  },
}

/** Etiqueta legible por outcome de resolución. */
export const DISPUTE_OUTCOME_LABEL: Record<string, string> = {
  procedente: 'Procedente',
  improcedente: 'Improcedente',
  parcial: 'Parcial',
}

const VACIO = '—'

/** Normaliza un status crudo del backend a uno conocido (fallback a open). */
function asStatus(raw: string): DisputeStatus {
  return raw === 'in_review' || raw === 'resolved' ? raw : 'open'
}

/**
 * Enmascara un debtor_id (UUID) a un identificador corto y legible: las últimas
 * 6 posiciones tras un prefijo de candado. Sólo se usa como CAÍDA cuando el
 * endpoint no pudo unir el nombre; nunca se inventa uno.
 */
function maskDebtorId(debtorId: string): string {
  const clean = debtorId.replace(/-/g, '')
  const tail = clean.slice(-6).toUpperCase()
  return tail ? `Deudor ••${tail}` : 'Deudor'
}

/** Nombre del deudor, con caída explícita al id enmascarado. */
function debtorLabel(d: CobranzaDispute): string {
  const name = d.debtor_name?.trim()
  return name && name.length > 0 ? name : maskDebtorId(d.debtor_id)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

export interface DisputaCardProps {
  dispute: CobranzaDispute
  /** Abre el modal de resolución para esta disputa (HUMANO, T-323). */
  onResolve: (dispute: CobranzaDispute) => void
}

export function DisputaCard({ dispute, onResolve }: DisputaCardProps) {
  const { formatCurrency, formatDate } = useI18n()
  const status = asStatus(dispute.status)
  const token = DISPUTE_ESTADO_TOKEN[status]
  const isResolved = status === 'resolved'

  const openedStr = React.useMemo(() => {
    const d = new Date(dispute.opened_at)
    return Number.isNaN(d.getTime())
      ? VACIO
      : formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
  }, [dispute.opened_at, formatDate])

  const montoStr =
    dispute.disputed_amount != null ? formatCurrency(dispute.disputed_amount) : null

  const outcomeLabel =
    dispute.outcome != null
      ? (DISPUTE_OUTCOME_LABEL[dispute.outcome] ?? dispute.outcome)
      : null

  return (
    <li
      className="rounded-xl border border-border bg-card p-4 space-y-2.5"
      data-testid={`disputa-card-${dispute.id}`}
    >
      {/* Header: deudor enmascarado + estado + fecha de apertura */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-fg truncate">
            {debtorLabel(dispute)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 shrink-0 ${token.bg} ${token.text} ${token.ring}`}
          >
            {token.label}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-fg-muted tabular-nums shrink-0">
          <ClockCounterClockwise className="w-3.5 h-3.5" aria-hidden="true" />
          {openedStr}
        </span>
      </div>

      {/* Motivo de la controversia */}
      <div className="flex items-start gap-2">
        <ShieldWarning
          className="w-4 h-4 mt-0.5 shrink-0 text-fg-muted"
          weight="duotone"
          aria-hidden="true"
        />
        <p className="text-sm text-fg leading-relaxed">
          <span className="font-medium text-fg-muted">Motivo:</span>{' '}
          {truncate(dispute.reason, 220)}
        </p>
      </div>

      {/* Monto disputado (cuando existe) */}
      {montoStr && (
        <div className="flex items-center gap-2">
          <CurrencyDollar
            className="w-4 h-4 shrink-0 text-fg-muted"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-sm text-fg tabular-nums">
            <span className="font-medium text-fg-muted">Monto en disputa:</span>{' '}
            {montoStr}
          </p>
        </div>
      )}

      {/* Footer: acción (resolver) o resultado si ya está resuelta */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
        {isResolved ? (
          <span className="text-xs text-fg-muted">
            Resultado:{' '}
            <span className="font-medium text-success">{outcomeLabel ?? VACIO}</span>
          </span>
        ) : (
          <span className="text-xs text-fg-muted">
            Requiere revisión de un operador.
          </span>
        )}
        {!isResolved && (
          <Button
            size="sm"
            hideArrow
            onClick={() => onResolve(dispute)}
            className="shrink-0"
            data-testid={`disputa-resolver-${dispute.id}`}
          >
            Resolver
          </Button>
        )}
      </div>
    </li>
  )
}
