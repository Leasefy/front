'use client'

/**
 * CarrierCardExpandible — visión #9.
 *
 * A per-insurer card that expands to reveal the full detail: condición,
 * costo estimado, tiempo de respuesta, motivo de rechazo, and a derived
 * "por qué" explanation. Used by:
 *   - MatrizAsegurabilidad "vista tarjetas" (expandable list)
 *   - the matriz table as the expanded-row detail panel
 *
 * HONESTY: while carrier backends are stubs, every priced result carries the
 * "Estimado · Prevalidación Leasefy" badge — driven by `carrier.isStub`
 * (the stream's stub_mode). It is NEVER labeled "Confirmado por la aseguradora".
 *
 * Actions are coherent placeholders. "Ver condiciones" reveals the conditions
 * inline (no endpoint needed). "Avanzar" has no backend yet → it degrades to a
 * disabled "Próximamente" control. No endpoints are invented here.
 */

import * as React from 'react'
import { useState } from 'react'
import {
  CaretDown,
  CheckCircle,
  XCircle,
  Warning,
  Question,
  Clock,
  Info,
} from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner as DSSpinner } from '@/components/ui/spinner'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import { formatPrimaCop, formatLatency } from '@/lib/cotizador/verdict-derive'
import { BadgeFuente } from './BadgeFuente'

// ---------------------------------------------------------------------------
// Status visual tokens (mirrors CarrierCard palette for consistency)
// ---------------------------------------------------------------------------

type Status = CarrierState['status']

function statusTokens(status: Status): { text: string; dot: string; chip: string } {
  switch (status) {
    case 'approved':
      return {
        text: 'text-success',
        dot: 'bg-success',
        chip: 'bg-success-soft text-success',
      }
    case 'conditional':
      return {
        text: 'text-warning',
        dot: 'bg-warning',
        chip: 'bg-warning-soft text-warning',
      }
    case 'rejected':
      return {
        text: 'text-danger',
        dot: 'bg-danger',
        chip: 'bg-danger-soft text-danger',
      }
    case 'pending':
      return {
        text: 'text-primary',
        dot: 'bg-primary',
        chip: 'bg-primary-soft text-primary',
      }
    case 'stub':
    case 'error':
    default:
      return {
        text: 'text-fg-muted',
        dot: 'bg-surface-muted',
        chip: 'bg-surface-muted text-fg-muted',
      }
  }
}

function StatusIcon({ status }: { status: Status }) {
  const cls = 'w-4 h-4 shrink-0'
  switch (status) {
    case 'approved':
      return <CheckCircle weight="fill" className={cn(cls, 'text-success')} />
    case 'conditional':
      return <Info weight="fill" className={cn(cls, 'text-warning')} />
    case 'rejected':
      return <XCircle weight="fill" className={cn(cls, 'text-danger')} />
    case 'error':
      return <Warning weight="fill" className={cn(cls, 'text-fg-muted')} />
    case 'stub':
      return <Question weight="fill" className={cn(cls, 'text-fg-muted')} />
    case 'pending':
      return <DSSpinner size="sm" variant="default" className="shrink-0" />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Optional richer-verdict fields (only rendered when a real portal supplies
// them — CarrierState does not declare them today, so we read defensively).
// ---------------------------------------------------------------------------

interface CarrierExtras {
  cobertura?: string | null      // human cobertura summary (e.g. "Daño + arrendamiento")
  vigencia?: string | null       // human vigencia (e.g. "12 meses")
  confianzaPct?: number | null   // 0..100 backend confidence
}

function carrierExtras(carrier: CarrierState): CarrierExtras {
  const c = carrier as CarrierState & {
    cobertura?: unknown
    vigencia?: unknown
    vigenciaMeses?: unknown
    confianza?: unknown
    confianzaPct?: unknown
  }
  const cobertura = typeof c.cobertura === 'string' && c.cobertura.trim() ? c.cobertura.trim() : null
  // vigencia may arrive as a string or a months number.
  let vigencia: string | null = null
  if (typeof c.vigencia === 'string' && c.vigencia.trim()) vigencia = c.vigencia.trim()
  else if (typeof c.vigenciaMeses === 'number' && Number.isFinite(c.vigenciaMeses)) {
    vigencia = String(c.vigenciaMeses)
  }
  // confianza may arrive as 0..1 or 0..100; normalize to a percent.
  let confianzaPct: number | null = null
  const rawConf =
    typeof c.confianzaPct === 'number'
      ? c.confianzaPct
      : typeof c.confianza === 'number'
        ? c.confianza
        : null
  if (rawConf != null && Number.isFinite(rawConf)) {
    confianzaPct = rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf)
  }
  return { cobertura, vigencia, confianzaPct }
}

// ---------------------------------------------------------------------------
// Derived "por qué"
// ---------------------------------------------------------------------------

function porQue(t: (k: string, p?: Record<string, string | number>) => string, carrier: CarrierState): string {
  switch (carrier.status) {
    case 'approved':
      return t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueApproved')
    case 'conditional':
      return t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueConditional', {
        n: carrier.condiciones.length,
      })
    case 'rejected':
      return carrier.motivoRechazo
        ? t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueRejectedWithReason')
        : t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueRejected')
    case 'error':
      return t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueError')
    case 'stub':
      return t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueStub')
    case 'pending':
    default:
      return t('inmobiliaria.ai.cotizador.detail.carrierCard.porQuePending')
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CarrierCardExpandibleProps {
  carrier: CarrierState
  /** Start expanded (used as the table expanded-row detail). */
  defaultOpen?: boolean
  /** Hide the outer card chrome when embedded inside a table row. */
  bare?: boolean
}

export function CarrierCardExpandible({
  carrier,
  defaultOpen = false,
  bare = false,
}: CarrierCardExpandibleProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)

  const tokens = statusTokens(carrier.status)
  const statusLabel = t(`inmobiliaria.ai.cotizador.detail.carrier.${carrier.status}Label`)
  const prima = formatPrimaCop(carrier.primaMensualCop)
  const tiempo = formatLatency(carrier.latencyMs)
  const isPriced = carrier.status === 'approved' || carrier.status === 'conditional'
  const panelId = `carrier-detail-${carrier.carrier.replace(/\s+/g, '-')}`

  // The expanded detail body — shared between bare (table row) and card mode.
  const detail = (
    <div className="space-y-4 text-sm">
      {/* Key facts grid */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-fg-muted">
            {t('inmobiliaria.ai.cotizador.detail.matriz.colCosto')}
            {/* matriz.colCosto = "Costo estimado" (existing key) */}
          </dt>
          <dd className="mt-0.5 font-medium text-fg">
            {prima ? (
              <span className="font-mono tabular-nums">
                {prima}
                <span className="ml-1 text-xs font-normal text-fg-muted">/mes</span>
              </span>
            ) : (
              <span className="text-fg-muted">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fg-muted">
            {t('inmobiliaria.ai.cotizador.detail.matriz.colTiempo')}
          </dt>
          <dd className="mt-0.5 flex items-center gap-1 font-medium text-fg">
            {tiempo ? (
              <>
                <Clock weight="regular" className="w-3.5 h-3.5 text-fg-muted" />
                <span className="tabular-nums">{tiempo}</span>
              </>
            ) : (
              <span className="text-fg-muted">—</span>
            )}
          </dd>
        </div>
      </dl>

      {/* Condiciones (conditional / approved-with-conditions) */}
      {carrier.condiciones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-fg-muted">
            {t('inmobiliaria.ai.cotizador.detail.carrier.condicionesTitle')}
          </p>
          <ul className="space-y-1">
            {carrier.condiciones.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-fg-muted"
              >
                <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-warning/60 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Motivo de rechazo / error */}
      {carrier.motivoRechazo && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-fg-muted">
            {t('inmobiliaria.ai.cotizador.detail.carrier.motivoRechazoTitle')}
          </p>
          <p className="text-sm text-danger">{carrier.motivoRechazo}</p>
        </div>
      )}

      {/* Derived "por qué" */}
      <div className="rounded-lg bg-surface-muted px-3 py-2.5">
        <p className="text-xs uppercase tracking-wide text-fg-muted">
          {t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueTitle')}
        </p>
        <p className="mt-1 text-sm text-fg-muted leading-relaxed">
          {porQue(t, carrier)}
        </p>
      </div>

      {/* Estimado disclaimer line (only on priced results) */}
      {isPriced && carrier.isStub && (
        <p className="text-xs text-fg-muted leading-relaxed">
          {t('inmobiliaria.ai.cotizador.detail.matriz.estimadoDisclaimer')}
        </p>
      )}

      {/* Actions — coherent placeholders, no invented endpoints */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {carrier.condiciones.length > 0 && (
          <span className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.cotizador.detail.carrierCard.condicionesVisibleHint')}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          hideArrow
          disabled
          title={t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
        >
          {t('inmobiliaria.ai.cotizador.detail.carrierCard.avanzarAction')}
          <span className="text-[10px] font-normal opacity-70">
            · {t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
          </span>
        </Button>
      </div>
    </div>
  )

  // Bare mode: just the detail body (table expanded row uses this).
  if (bare) {
    return <div className="px-4 py-4">{detail}</div>
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Collapsible card-header disclosure toggle (rich icon+name+status-chip+price
          row with AnimatePresence-style reveal) — Cadence Accordion can't host this
          header; kept native with aria-expanded per playbook disclosure allowlist. */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon status={carrier.status} />
          <span className="font-medium text-fg truncate">
            {carrier.carrier}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              tokens.chip,
            )}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {prima && (
            <span className={cn('font-mono tabular-nums text-sm font-semibold', tokens.text)}>
              {prima}
            </span>
          )}
          {isPriced && <BadgeFuente stubMode={carrier.isStub} />}
          <CaretDown
            weight="bold"
            className={cn(
              'w-4 h-4 text-fg-muted transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>

      {open && (
        <div
          id={panelId}
          className="border-t border-border px-4 py-4"
        >
          {detail}
        </div>
      )}
    </div>
  )
}
