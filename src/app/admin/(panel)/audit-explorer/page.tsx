'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'

const PAGE_SIZE = 100

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string
  created_at: string
  actor_type: string
  action: string
  entity_type: string | null
  entity_id: string | null
  payload: Record<string, unknown> | null
  tenant_id: string | null
  legal_name: string | null
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /audit-explorer — audit_log search for SIC / SAGRILAFT audits (FRONT.md §6.24 · BACK.md §8.14). */
export default function AuditExplorerPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const action    = get('action')
  const debtorDoc = get('debtorDoc')
  const entityId  = get('entityId')
  const from      = get('from')
  const to        = get('to')

  const result = useApiQuery<Paginated<AuditLogRow>>(
    (signal) =>
      adminApi('/audit-log', {
        query: { action, debtorDoc, entityId, from, to, page },
        signal,
      }),
    [action, debtorDoc, entityId, from, to, page],
  )

  const hasFilters = action || debtorDoc || entityId || from || to

  const columns: Column<AuditLogRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-fg-muted text-xs font-mono">
          {fmtDateTime(r.created_at)}
        </span>
      ),
    },
    {
      header: 'Actor',
      cell: (r) => (
        <span className="font-mono text-[11px] uppercase tracking-mono-label text-fg-muted">
          {r.actor_type}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: (r) => (
        <span className="font-mono text-xs text-fg">{r.action}</span>
      ),
    },
    {
      header: 'Entity',
      cell: (r) => (
        <div className="font-mono text-[10px] text-fg-subtle">
          <div>{r.entity_type ?? '—'}</div>
          <div>{r.entity_id ? `${r.entity_id.slice(0, 8)}…` : '—'}</div>
        </div>
      ),
    },
    {
      header: 'Agencia',
      cell: (r) => (
        <span className="truncate block max-w-[140px] text-xs text-fg-muted">{r.legal_name ?? '—'}</span>
      ),
    },
    {
      header: 'Payload',
      cell: (r) => {
        const full = r.payload ? JSON.stringify(r.payload) : null
        const truncated = full ? full.slice(0, 100) : '—'
        return (
          <span
            className="text-xs text-fg-muted font-mono max-w-[280px] truncate block"
            title={full ?? undefined}
          >
            {truncated}
          </span>
        )
      },
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="17 · audit explorer"
        title="Audit Explorer"
        description="Búsqueda en audit_log para auditorías SIC / SAGRILAFT. Append-only."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block flex-1 min-w-48">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">
            action LIKE
          </span>
          <input
            className="input"
            value={action}
            onChange={(e) => setFilters({ action: e.target.value }, { resetPage: true })}
            placeholder="ej: payment.recovered"
          />
        </label>
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">
            cédula deudor
          </span>
          <input
            className="input w-40"
            value={debtorDoc}
            onChange={(e) => setFilters({ debtorDoc: e.target.value }, { resetPage: true })}
            placeholder="1234567"
          />
        </label>
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">
            entity_id
          </span>
          <input
            className="input w-44"
            value={entityId}
            onChange={(e) => setFilters({ entityId: e.target.value }, { resetPage: true })}
            placeholder="UUID"
          />
        </label>
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">desde</span>
          <input
            type="date"
            className="input w-40"
            value={from}
            onChange={(e) => setFilters({ from: e.target.value }, { resetPage: true })}
          />
        </label>
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">hasta</span>
          <input
            type="date"
            className="input w-40"
            value={to}
            onChange={(e) => setFilters({ to: e.target.value }, { resetPage: true })}
          />
        </label>
        {hasFilters && (
          <button
            className="btn"
            onClick={() =>
              setFilters(
                { action: '', debtorDoc: '', entityId: '', from: '', to: '' },
                { resetPage: true },
              )
            }
          >
            × limpiar
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.id}
        isLoading={result.isLoading}
        error={result.error}
        emptyTitle="Sin resultados"
        emptyHint="Ajustá los filtros."
      />

      {result.data && (
        <Pagination page={page} total={result.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
      )}
    </div>
  )
}
