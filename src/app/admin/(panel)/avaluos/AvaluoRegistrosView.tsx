'use client'

import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { Pill } from '@/components/admin/Pill'
import type { AvaluoListItem } from '@/lib/admin/avaluos'
import { AVALUO_STATES, avaluoStateMeta } from '@/lib/admin/avaluo-states'

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
      cell: (r) => {
        const meta = avaluoStateMeta(r.state)
        return <Pill tone={meta.tone}>{meta.label}</Pill>
      },
    },
    {
      header: 'Valor',
      align: 'right',
      // fmtCOP already renders '—' for null (refused valuation). `city` is always
      // null on this route, so it is intentionally not a column.
      cell: (r) => <span className="tabular-nums font-medium">{fmtCOP(r.valueCop)}</span>,
    },
    {
      header: 'Método',
      cell: (r) => (
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
          {r.method || '—'}
        </span>
      ),
    },
    {
      header: 'Firma',
      cell: (r) =>
        r.signedBy ? (
          <span className="text-xs">
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
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-fg-muted text-xs font-mono">
          {fmtDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      header: 'Certificado',
      cell: (r) => <span className="font-mono text-[11px] text-fg-dim">{r.slug}</span>,
    },
  ]

  return (
    <div>
      {/* State filter — segmented control over the real lifecycle states + "Todos". */}
      <div className="flex flex-wrap gap-1 mb-4">
        {STATE_TABS.map((tab) => (
          <button
            key={tab.value || 'todos'}
            type="button"
            aria-pressed={activeState === tab.value}
            className={`btn ${activeState === tab.value ? 'btn-primary' : ''}`.trim()}
            onClick={() => onStateChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={items}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        emptyTitle="Sin registros"
        emptyHint="No hay certificados para este estado."
        onRowClick={(r) => onRowClick(r.id)}
      />

      {items && total !== undefined && (
        <Pagination page={page} total={total} pageSize={pageSize} onPage={onPage} />
      )}
    </div>
  )
}
