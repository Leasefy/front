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
  Info,
  CaretDown,
  Star,
  Table as TableIcon,
  SquaresFour,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import {
  buildMatrizRows,
  formatPrimaCop,
  formatLatency,
  type MatrizRow,
} from '@/lib/cotizador/verdict-derive'
import {
  deriveCarrierLabelsForSet,
  type CarrierLabel,
} from '@/lib/cotizador/carrier-labels'
import { CarrierCardExpandible } from './CarrierCardExpandible'
import { CarrierLabelChips } from './CarrierLabelChips'

// ---------------------------------------------------------------------------
// Status icon (compact, table-cell sized)
// ---------------------------------------------------------------------------

type Status = CarrierState['status']

function ResultIcon({ status }: { status: Status }) {
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
      return <Spinner size="sm" className="shrink-0" />
    default:
      return null
  }
}

function resultTextClass(status: Status): string {
  switch (status) {
    case 'approved':
      return 'text-success'
    case 'conditional':
      return 'text-warning'
    case 'rejected':
      return 'text-danger'
    default:
      return 'text-fg-muted'
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
  // Selector excluyente (UI-DS-CONTRACT §3).
  return (
    <SegmentedControl<ViewMode>
      aria-label={t('inmobiliaria.ai.cotizador.detail.matriz.viewToggleLabel')}
      value={value}
      onChange={onChange}
      options={opts.map(({ id, label, Icon }) => ({
        value: id,
        ariaLabel: label,
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" weight={value === id ? 'fill' : 'regular'} />
            {label}
          </span>
        ),
      }))}
    />
  )
}

// ---------------------------------------------------------------------------
// Recommendation chip
// ---------------------------------------------------------------------------

function RecomendadaChip() {
  const { t } = useI18n()
  return (
    <Badge className="gap-1 px-2 py-0.5 text-[10px] font-semibold">
      <Star weight="fill" className="w-3 h-3" />
      {t('inmobiliaria.ai.cotizador.detail.matriz.recomendada')}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Desktop table
// ---------------------------------------------------------------------------

function MatrizTable({
  rows,
  recommendedCarrier,
  labelsByCarrier,
}: {
  rows: MatrizRow[]
  recommendedCarrier: string | null
  labelsByCarrier: Map<string, CarrierLabel[]>
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table className="w-full text-left border-collapse">
        <TableHeader>
          <TableRow className="border-b border-border bg-surface-muted/60">
            <TableHead className="px-4 py-2.5">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colAseguradora')}
            </TableHead>
            <TableHead className="px-4 py-2.5">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colResultado')}
            </TableHead>
            <TableHead className="px-4 py-2.5">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colCondicion')}
            </TableHead>
            <TableHead className="px-4 py-2.5 text-right">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colCosto')}
            </TableHead>
            <TableHead className="px-4 py-2.5 text-right">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colTiempo')}
            </TableHead>
            <TableHead className="px-4 py-2.5">
              {t('inmobiliaria.ai.cotizador.detail.matriz.colRecomendacion')}
            </TableHead>
            <TableHead className="px-2 py-2.5 w-8" aria-hidden="true" />
          </TableRow>
        </TableHeader>
        <TableBody>
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
                <TableRow
                  id={rowId}
                  onClick={() => setExpanded(o => (o === carrier.carrier ? null : carrier.carrier))}
                  className={cn(
                    'border-b border-border cursor-pointer transition-colors',
                    'hover:bg-surface-muted/50',
                    isRecommended && 'bg-primary-soft/50',
                  )}
                >
                  <TableHead scope="row" className="px-4 py-3 font-normal align-top">
                    <span className="block font-medium text-fg">
                      {carrier.carrier}
                    </span>
                    <CarrierLabelChips
                      labels={labelsByCarrier.get(carrier.carrier) ?? []}
                      className="mt-1.5"
                    />
                  </TableHead>
                  <TableCell className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', resultTextClass(carrier.status))}>
                      <ResultIcon status={carrier.status} />
                      {t(`inmobiliaria.ai.cotizador.detail.carrier.${carrier.status}Label`)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-fg-muted max-w-[14rem] truncate">
                    {condicionResumen}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {prima ? (
                      <span className="inline-flex flex-col items-end">
                        <span className="font-mono tabular-nums text-sm font-semibold text-fg">
                          {prima}
                        </span>
                        {isPriced && carrier.isStub && (
                          <span className="text-[10px] text-fg-muted">
                            {t('inmobiliaria.ai.cotizador.detail.fuente.estimado')}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-fg-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm tabular-nums text-fg-muted">
                    {tiempo ?? '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {isRecommended ? <RecomendadaChip /> : <span className="text-fg-muted">—</span>}
                  </TableCell>
                  <TableCell className="px-2 py-3 text-right">
                    <CaretDown
                      weight="bold"
                      aria-hidden="true"
                      className={cn('w-4 h-4 text-fg-muted transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow id={detailId} className="bg-surface-muted/40">
                    <TableCell colSpan={7} className="p-0">
                      <CarrierCardExpandible carrier={carrier} bare />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
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

  // Comparative etiquetas (visión #12) — purely derived from the carriers we
  // already have; no backend signal. Computed once per render over the set.
  const labelsByCarrier = deriveCarrierLabelsForSet(carriers)

  return (
    <section
      aria-labelledby="matriz-heading"
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2
            id="matriz-heading"
            className="text-base font-semibold text-fg"
          >
            {t('inmobiliaria.ai.cotizador.detail.matriz.titulo')}
          </h2>
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.ai.cotizador.detail.matriz.subtitle', { n: carriers.length })}
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* Prevalidación disclaimer line — honest framing for the whole matriz. */}
      {anyEstimado && (
        <p className="flex items-start gap-1.5 text-xs text-fg-muted leading-relaxed">
          <Info weight="regular" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {t('inmobiliaria.ai.cotizador.detail.matriz.prevalidacionNote')}
        </p>
      )}

      {/* Desktop: table when 'matriz'; cards when 'tarjetas'. Mobile is always
          cards (table hidden < md). */}
      {view === 'matriz' ? (
        <>
          <div className="hidden md:block">
            <MatrizTable
              rows={rows}
              recommendedCarrier={recommended}
              labelsByCarrier={labelsByCarrier}
            />
          </div>
          <div className="md:hidden space-y-2.5">
            {rows.map(({ carrier }) => (
              <div key={carrier.carrier} className="relative">
                {recommended === carrier.carrier && (
                  <div className="absolute -top-2 left-4 z-10">
                    <RecomendadaChip />
                  </div>
                )}
                <CarrierLabelChips
                  labels={labelsByCarrier.get(carrier.carrier) ?? []}
                  className="mb-1.5 px-1"
                />
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
              <CarrierLabelChips
                labels={labelsByCarrier.get(carrier.carrier) ?? []}
                className="mb-1.5 px-1"
              />
              <CarrierCardExpandible carrier={carrier} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
