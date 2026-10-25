'use client'

import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import type { AvaluoListItem } from '@/lib/admin/avaluos'
import { AVALUO_STATES, avaluoStateMeta } from '@/lib/admin/avaluo-states'
import { MonoLabel } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'

/** Filter tabs: "Todos" ('' → no state filter) + the real lifecycle states. */
const STATE_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  ...AVALUO_STATES.map((s) => ({ value: s, label: avaluoStateMeta(s).label })),
]

export interface AvaluoRegistrosViewProps {
  /** Active state filter; '' means "Todos" (no filter). */
  activeState: string
  onStateChange: (state: string) => void
  /** 0-indexed page. */
  page: number
  onPage: (page: number) => void
  items: AvaluoListItem[] | undefined
  total: number | undefined
  pageSize: number
  isLoading: boolean
  error: Error | null
  onRowClick: (id: string) => void
}

/**
 * Presentational "records by state" table for the admin avalúos screen. Pure:
 * the filter value, list data, and navigation all arrive as props (the container
 * wires the URL filters, the list fetch, and the router), so it renders
 * deterministically and is testable without mocking next/navigation.
 */
export function AvaluoRegistrosView({
  activeState,
  onStateChange,
  page,
  onPage,
  items,
  total,
  pageSize,
  isLoading,
  error,
  onRowClick,
}: AvaluoRegistrosViewProps) {
  const columns: Column<AvaluoListItem>[] = [
    {
      header: 'Estado',
      texto: (r) => avaluoStateMeta(r.state).label,
      cell: (r) => {
        const meta = avaluoStateMeta(r.state)
        return <Pill tone={meta.tone}>{meta.label}</Pill>
      },
    },
    {
      header: 'Valor',
      align: 'right',
      texto: (r) => r.valueCop,
      // fmtCOP already renders '—' for null (refused valuation). `city` is always
      // null on this route, so it is intentionally not a column.
      cell: (r) => <span className="tabular-nums font-medium">{fmtCOP(r.valueCop)}</span>,
    },
    {
      header: 'Método',
      texto: (r) => r.method,
      cell: (r) => (
        <MonoLabel>
          {r.method || '—'}
        </MonoLabel>
      ),
    },
    {
      header: 'Firma',
      texto: (r) => (r.signedBy ? `${r.signedBy}${r.signedAt ? ` · ${fmtDateTime(r.signedAt)}` : ''}` : ''),
      cell: (r) =>
        r.signedBy ? (
          <span className="text-caption">
            <span className="text-fg">{r.signedBy}</span>
            {r.signedAt && (
              <span className="block text-fg-subtle font-mono">{fmtDateTime(r.signedAt)}</span>
            )}
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Creado',
      align: 'right',
      texto: (r) => fmtDateTime(r.createdAt),
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-fg-muted text-caption font-mono">
          {fmtDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      header: 'Certificado',
      texto: (r) => r.slug,
      cell: (r) => <span className="font-mono text-caption text-fg-muted">{r.slug}</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      getKey={(r) => r.id}
      isLoading={isLoading}
      error={error}
      emptyTitle="Sin registros"
      emptyHint="No hay certificados para este estado."
      onRowClick={(r) => onRowClick(r.id)}
      aria-label="Certificados de avalúo"
      queSon={['certificado', 'certificados']}
      paginacion={items && total !== undefined ? { page, total, pageSize, onPage } : undefined}
      barra={
        // Ronda 30 (revisora r27): el estado con las pestañas de la casa (antes una fila de botones); el
        // conteo va en la abierta (el back cuenta sólo lo que se pide).
        <PestanasDeEstado
          etiqueta="Estado del certificado"
          valor={activeState || 'todos'}
          onCambio={(v) => onStateChange(v === 'todos' ? '' : v)}
          pestanas={STATE_TABS.map((tab) => ({
            valor: tab.value || 'todos',
            etiqueta: tab.label,
            cuantos: activeState === tab.value && total !== undefined ? total : null,
            fija: true,
          }))}
        />
      }
    />
  )
}
