'use client'

/**
 * LlamadasTab — Phase 31 plan 31-09.
 *
 * md+: table of calls; sm: stacked card list.
 *
 * Row click → CAJÓN con el detalle completo (LlamadaDetalleSheet), no la
 * página. Pedido de Nico 2026-08-25: navegar a la página perdía el contexto
 * del caso, y en dev el primer clic moría compilando la ruta («da un error y
 * no pasa nada»). La página completa sigue existiendo — el pie del cajón la
 * enlaza.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { useDebtorCalls } from '@/lib/hooks/cobranza/use-debtor-calls'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import { LlamadaDetalleSheet } from '@/components/inmobiliaria/cobranza/LlamadaDetalleSheet'

void React

interface LlamadasTabProps {
  debtorId: string
  /** Bump from parent (Phase 31 plan 31-11 realtime) to force a refetch. */
  refetchKey?: number
}

function formatDuration(sec: number | null): string {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function LlamadasTab({ debtorId, refetchKey = 0 }: LlamadasTabProps) {
  const { t, locale } = useI18n()
  const { data, isLoading, error, refetch } = useDebtorCalls({ debtorId })

  // La llamada abierta en el cajón. Vive ANTES de los early-return: un hook
  // detrás de un `return` condicional rompe el orden de hooks de React.
  const [llamadaAbierta, setLlamadaAbierta] = useState<string | null>(null)

  // Realtime-driven refetch (D-31-18 single refetch per event).
  useEffect(() => {
    if (refetchKey > 0) void refetch()
  }, [refetchKey, refetch])

  /**
   * Paginado de presentación: el historial de llamadas de un deudor se acumula
   * con cada gestión y el endpoint no acepta page/limit.
   *
   * Va ANTES de los early-return de abajo: un hook detrás de un `return`
   * condicional rompe el orden de hooks de React. Alimenta las dos vistas
   * (tabla en ≥md, tarjetas en móvil) para que muestren la misma página.
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(data?.calls ?? [])

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-12 bg-surface-muted rounded-sm animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.llamadas.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.llamadas.errorRetry')}
        </Button>
      </div>
    )
  }

  const calls = data?.calls ?? []
  if (calls.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.detail.llamadas.empty')}
        </p>
      </div>
    )
  }

  const abrir = (callId: string) => setLlamadaAbierta(callId)

  return (
    <>
      {/* md+ table */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-border bg-surface">
        <Table className="min-w-full divide-y divide-border text-sm">
          <TableHeader className="bg-surface-muted">
            <TableRow>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.startedAt')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.duration')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.outcome')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.qa')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.compliance')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border-faint">
            {pageItems.map((c) => (
              <TableRow
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => abrir(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') abrir(c.id)
                }}
                className="hover:bg-surface-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <TableCell className="px-3 py-2 text-xs text-fg-muted">
                  {new Date(c.started_at).toLocaleString(locale)}
                </TableCell>
                <TableCell className="px-3 py-2 font-mono text-xs">
                  {formatDuration(c.duration_seconds)}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className="text-xs">{c.status ?? '—'}</span>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className="text-xs font-mono">
                    {c.qa_score != null ? c.qa_score.toFixed(1) : '—'}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Badge variant={c.compliance_flags_count > 0 ? 'warning' : 'success'}>
                    {c.compliance_flags_count}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* sm cards */}
      <ul className="md:hidden space-y-2">
        {pageItems.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => abrir(c.id)}
              className="w-full text-left rounded-sm border border-border bg-surface px-3 py-2"
            >
              <p className="text-xs text-fg-muted">
                {new Date(c.started_at).toLocaleString(locale)}
              </p>
              <p className="text-sm font-medium text-fg mt-0.5">
                {c.status ?? '—'} · {formatDuration(c.duration_seconds)}
              </p>
              <p className="text-xs text-fg-muted mt-0.5">
                QA {c.qa_score?.toFixed(1) ?? '—'} · {c.compliance_flags_count}{' '}
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.compliance')}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <LlamadaDetalleSheet
        callId={llamadaAbierta}
        onClose={() => setLlamadaAbierta(null)}
      />

      {/* Pie único para las dos vistas: sólo si hay más de una página. */}
      {shouldPaginate && (
        <div className="mt-3 rounded-md border border-border bg-surface px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </>
  )
}
