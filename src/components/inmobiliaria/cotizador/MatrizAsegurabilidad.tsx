'use client'

/**
 * MatrizAsegurabilidad — visión #8 + #13.
 *
 * Comparison of aseguradora × { resultado, condición, costo estimado, tiempo,
 * recomendación } built from the carriers accumulated by the SSE stream
 * (aseguradoras_consultadas).
 *
 * Layout:
 *   - desktop (md+): a comparison table; clicking a row expands its detail
 *     (CarrierCardExpandible bare).
 *   - mobile (< md): collapses to a stack of expandable cards.
 *   - a "vista matriz / vista tarjetas" toggle forces the card view on desktop
 *     too (operator preference).
 *
 * Ordering (verdict-derive.buildMatrizRows): asegurables first (cheapest prima
 * on top), then condicionadas, then no-asegurables / sin resultado.
 *
 * HONESTY: priced rows carry the "Estimado · Prevalidación Leasefy" badge while
 * carrier backends are stubs (carrier.isStub === stub_mode). The cheapest
 * asegurable row is the ONE row that gets brand (#1A40FF) emphasis as the
 * recommendation — nothing else uses the brand color.
 */

import * as React from 'react'
import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Warning,
  Question,
  Spinner,
  Info,
  CaretDown,
  Star,
  Table as TableIcon,
  SquaresFour,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import {
  buildMatrizRows,
  formatPrimaCop,
  formatLatency,
  type MatrizRow,
} from '@/lib/cotizador/verdict-derive'
import { CarrierCardExpandible } from './CarrierCardExpandible'

// ---------------------------------------------------------------------------
// Status icon (compact, table-cell sized)
// ---------------------------------------------------------------------------

type Status = CarrierState['status']

function ResultIcon({ status }: { status: Status }) {
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

function resultTextClass(status: Status): string {
  switch (status) {
    case 'approved':
      return 'text-[#2C7A53] dark:text-[#3EAE70]'
    case 'conditional':
      return 'text-[#B7791F] dark:text-[#D2992F]'
    case 'rejected':
      return 'text-[#C4503B] dark:text-[#E0664D]'
    default:
      return 'text-neutral-500 dark:text-neutral-400'
  }
}

// ---------------------------------------------------------------------------
// View toggle
// ---------------------------------------------------------------------------

type ViewMode = 'matriz' | 'tarjetas'

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const { t } = useI18n()
  const opts: { id: ViewMode; label: string; Icon: PhosphorIcon }[] = [
    { id: 'matriz', label: t('inmobiliaria.ai.cotizador.detail.matriz.verMatriz'), Icon: TableIcon },
    { id: 'tarjetas', label: t('inmobiliaria.ai.cotizador.detail.matriz.verTarjetas'), Icon: SquaresFour },
  ]
  return (
    <div
      role="group"
      aria-label={t('inmobiliaria.ai.cotizador.detail.matriz.viewToggleLabel')}
      className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-700 p-0.5"
    >
      {opts.map(({ id, label, Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
              active
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200',
            )}
          >
            <Icon className="w-3.5 h-3.5" weight={active ? 'fill' : 'regular'} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recommendation chip
// ---------------------------------------------------------------------------

function RecomendadaChip() {
  const { t } = useI18n()
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#1A40FF]/10 dark:bg-[#1A40FF]/20 px-2 py-0.5 text-[10px] font-semibold text-[#1A40FF] dark:text-[#8FA3FF]">
      <Star weight="fill" className="w-3 h-3" />
      {t('inmobiliaria.ai.cotizador.detail.matriz.recomendada')}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Desktop table
// ---------------------------------------------------------------------------

function MatrizTable({ rows, recommendedCarrier }: { rows: MatrizRow[]; recommendedCarrier: string | null }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80 dark:border-neutral-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30">
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colAseguradora')}
            </th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colResultado')}
            </th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colCondicion')}
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colCosto')}
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colTiempo')}
            </th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colRecomendacion')}
            </th>
            <th className="px-2 py-2.5 w-8" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ carrier }) => {
            const isRecommended = recommendedCarrier === carrier.carrier
            const isOpen = expanded === carrier.carrier
            const prima = formatPrimaCop(carrier.primaMensualCop)
            const tiempo = formatLatency(carrier.latencyMs)
            const condicionResumen =
              carrier.condiciones.length > 0
                ? t('inmobiliaria.ai.cotizador.detail.matriz.condicionesCount', {
                    n: carrier.condiciones.length,
                  })
                : carrier.motivoRechazo ?? '—'
            const rowId = `matriz-row-${carrier.carrier.replace(/\s+/g, '-')}`
            const detailId = `matriz-detail-${carrier.carrier.replace(/\s+/g, '-')}`
            const isPriced = carrier.status === 'approved' || carrier.status === 'conditional'

            return (
              <React.Fragment key={carrier.carrier}>
                <tr
                  id={rowId}
                  onClick={() => setExpanded(o => (o === carrier.carrier ? null : carrier.carrier))}
                  className={cn(
                    'border-b border-neutral-100 dark:border-neutral-800/60 cursor-pointer transition-colors',
                    'hover:bg-neutral-50 dark:hover:bg-neutral-800/40',
                    isRecommended && 'bg-[#1A40FF]/[0.035] dark:bg-[#1A40FF]/[0.08]',
                  )}
                >
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">
                      {carrier.carrier}
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', resultTextClass(carrier.status))}>
                      <ResultIcon status={carrier.status} />
                      {t(`inmobiliaria.ai.cotizador.detail.carrier.${carrier.status}Label`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400 max-w-[14rem] truncate">
                    {condicionResumen}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {prima ? (
                      <span className="inline-flex flex-col items-end">
                        <span className="font-mono tabular-nums text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                          {prima}
                        </span>
                        {isPriced && carrier.isStub && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            {t('inmobiliaria.ai.cotizador.detail.fuente.estimado')}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-neutral-300 dark:text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
                    {tiempo ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {isRecommended ? <RecomendadaChip /> : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <CaretDown
                      weight="bold"
                      aria-hidden="true"
                      className={cn('w-4 h-4 text-neutral-400 transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                  </td>
                </tr>
                {isOpen && (
                  <tr id={detailId} className="bg-neutral-50/40 dark:bg-neutral-800/20">
                    <td colSpan={7} className="p-0">
                      <CarrierCardExpandible carrier={carrier} bare />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MatrizAsegurabilidadProps {
  carriers: CarrierState[]
}

export function MatrizAsegurabilidad({ carriers }: MatrizAsegurabilidadProps) {
  const { t } = useI18n()
  const [view, setView] = useState<ViewMode>('matriz')

  if (carriers.length === 0) return null

  const rows = buildMatrizRows(carriers)

  // The recommended carrier = cheapest asegurable (first 'asegurable' row).
  // buildMatrizRows already sorts asegurables to the top, cheapest first.
  const recommended = rows.find(r => r.group === 'asegurable')?.carrier.carrier ?? null

  // Any stub-priced row → the whole matriz is in prevalidación mode.
  const anyEstimado = carriers.some(
    c => c.isStub && (c.status === 'approved' || c.status === 'conditional'),
  )

  return (
    <section
      aria-labelledby="matriz-heading"
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2
            id="matriz-heading"
            className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100"
          >
            {t('inmobiliaria.ai.cotizador.detail.matriz.titulo')}
          </h2>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cotizador.detail.matriz.subtitle', { n: carriers.length })}
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* Prevalidación disclaimer line — honest framing for the whole matriz. */}
      {anyEstimado && (
        <p className="flex items-start gap-1.5 text-[12px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
          <Info weight="regular" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {t('inmobiliaria.ai.cotizador.detail.matriz.prevalidacionNote')}
        </p>
      )}

      {/* Desktop: table when 'matriz'; cards when 'tarjetas'. Mobile is always
          cards (table hidden < md). */}
      {view === 'matriz' ? (
        <>
          <div className="hidden md:block">
            <MatrizTable rows={rows} recommendedCarrier={recommended} />
          </div>
          <div className="md:hidden space-y-2.5">
            {rows.map(({ carrier }) => (
              <div key={carrier.carrier} className="relative">
                {recommended === carrier.carrier && (
                  <div className="absolute -top-2 left-4 z-10">
                    <RecomendadaChip />
                  </div>
                )}
                <CarrierCardExpandible carrier={carrier} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ carrier }) => (
            <div key={carrier.carrier} className="relative">
              {recommended === carrier.carrier && (
                <div className="absolute -top-2 left-4 z-10">
                  <RecomendadaChip />
                </div>
              )}
              <CarrierCardExpandible carrier={carrier} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
