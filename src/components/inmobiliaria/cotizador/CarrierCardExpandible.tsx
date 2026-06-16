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
  Spinner,
  Clock,
  Info,
} from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import { formatPrimaCop, formatLatency } from '@/lib/cotizador/verdict-derive'

// ---------------------------------------------------------------------------
// Status visual tokens (mirrors CarrierCard palette for consistency)
// ---------------------------------------------------------------------------

type Status = CarrierState['status']

function statusTokens(status: Status): { text: string; dot: string; chip: string } {
  switch (status) {
    case 'approved':
      return {
        text: 'text-[#2C7A53] dark:text-[#3EAE70]',
        dot: 'bg-[#2C7A53]',
        chip: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70]',
      }
    case 'conditional':
      return {
        text: 'text-[#B7791F] dark:text-[#D2992F]',
        dot: 'bg-[#B7791F]',
        chip: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F]',
      }
    case 'rejected':
      return {
        text: 'text-[#C4503B] dark:text-[#E0664D]',
        dot: 'bg-[#C4503B]',
        chip: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D]',
      }
    case 'pending':
      return {
        text: 'text-[#1A40FF] dark:text-[#5570FF]',
        dot: 'bg-[#1A40FF]',
        chip: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]',
      }
    case 'stub':
    case 'error':
    default:
      return {
        text: 'text-neutral-600 dark:text-neutral-300',
        dot: 'bg-neutral-400',
        chip: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
      }
  }
}

function StatusIcon({ status }: { status: Status }) {
  const cls = 'w-4 h-4 shrink-0'
  switch (status) {
    case 'approved':
      return <CheckCircle weight="fill" className={cn(cls, 'text-[#2C7A53]')} />
    case 'conditional':
      return <Info weight="fill" className={cn(cls, 'text-[#B7791F]')} />
    case 'rejected':
      return <XCircle weight="fill" className={cn(cls, 'text-[#C4503B]')} />
    case 'error':
      return <Warning weight="fill" className={cn(cls, 'text-neutral-500')} />
    case 'stub':
      return <Question weight="fill" className={cn(cls, 'text-neutral-500')} />
    case 'pending':
      return <Spinner weight="bold" className={cn(cls, 'text-[#1A40FF] animate-spin')} />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Estimado badge (honesty contract)
// ---------------------------------------------------------------------------

function EstimadoBadge({ isStub }: { isStub: boolean }) {
  const { t } = useI18n()
  // While stub_mode is true → "Estimado · Prevalidación Leasefy". When the
  // backend connects to real insurer portals (isStub=false) → "Confirmado".
  const label = isStub
    ? t('inmobiliaria.ai.cotizador.detail.fuente.estimado')
    : t('inmobiliaria.ai.cotizador.detail.fuente.confirmado')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        isStub
          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
          : 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70]',
      )}
      title={isStub ? t('inmobiliaria.ai.cotizador.detail.fuente.estimadoTooltip') : undefined}
    >
      <span aria-hidden="true" className={cn('w-1 h-1 rounded-full', isStub ? 'bg-neutral-400' : 'bg-[#2C7A53]')} />
      {label}
    </span>
  )
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
          <dt className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {t('inmobiliaria.ai.cotizador.detail.matriz.colCosto')}
            {/* matriz.colCosto = "Costo estimado" (existing key) */}
          </dt>
          <dd className="mt-0.5 font-medium text-neutral-800 dark:text-neutral-100">
            {prima ? (
              <span className="font-mono tabular-nums">
                {prima}
                <span className="ml-1 text-xs font-normal text-neutral-400">/mes</span>
              </span>
            ) : (
              <span className="text-neutral-400">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {t('inmobiliaria.ai.cotizador.detail.matriz.colTiempo')}
          </dt>
          <dd className="mt-0.5 flex items-center gap-1 font-medium text-neutral-800 dark:text-neutral-100">
            {tiempo ? (
              <>
                <Clock weight="regular" className="w-3.5 h-3.5 text-neutral-400" />
                <span className="tabular-nums">{tiempo}</span>
              </>
            ) : (
              <span className="text-neutral-400">—</span>
            )}
          </dd>
        </div>
      </dl>

      {/* Condiciones (conditional / approved-with-conditions) */}
      {carrier.condiciones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {t('inmobiliaria.ai.cotizador.detail.carrier.condicionesTitle')}
          </p>
          <ul className="space-y-1">
            {carrier.condiciones.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[13px] text-neutral-600 dark:text-neutral-300"
              >
                <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-[#B7791F]/60 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Motivo de rechazo / error */}
      {carrier.motivoRechazo && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {t('inmobiliaria.ai.cotizador.detail.carrier.motivoRechazoTitle')}
          </p>
          <p className="text-[13px] text-[#C4503B] dark:text-[#E0664D]">{carrier.motivoRechazo}</p>
        </div>
      )}

      {/* Derived "por qué" */}
      <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          {t('inmobiliaria.ai.cotizador.detail.carrierCard.porQueTitle')}
        </p>
        <p className="mt-1 text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
          {porQue(t, carrier)}
        </p>
      </div>

      {/* Estimado disclaimer line (only on priced results) */}
      {isPriced && carrier.isStub && (
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
          {t('inmobiliaria.ai.cotizador.detail.matriz.estimadoDisclaimer')}
        </p>
      )}

      {/* Actions — coherent placeholders, no invented endpoints */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {carrier.condiciones.length > 0 && (
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {t('inmobiliaria.ai.cotizador.detail.carrierCard.condicionesVisibleHint')}
          </span>
        )}
        <button
          type="button"
          disabled
          title={t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-[12px] font-medium text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
        >
          {t('inmobiliaria.ai.cotizador.detail.carrierCard.avanzarAction')}
          <span className="text-[10px] font-normal opacity-70">
            · {t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
          </span>
        </button>
      </div>
    </div>
  )

  // Bare mode: just the detail body (table expanded row uses this).
  if (bare) {
    return <div className="px-4 py-4">{detail}</div>
  }

  return (
    <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon status={carrier.status} />
          <span className="font-medium text-neutral-800 dark:text-neutral-100 truncate">
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
          {isPriced && <EstimadoBadge isStub={carrier.isStub} />}
          <CaretDown
            weight="bold"
            className={cn(
              'w-4 h-4 text-neutral-400 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>

      {open && (
        <div
          id={panelId}
          className="border-t border-neutral-200/80 dark:border-neutral-800 px-4 py-4"
        >
          {detail}
        </div>
      )}
    </div>
  )
}
