'use client'

import { useState } from 'react'
import { adminApi, adminApiUrl } from '@/lib/admin/api'
import { getSupabase } from '@/lib/supabase/client'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'

const PAGE_SIZE = 100

// ── Types ──────────────────────────────────────────────────────────────────

interface EventRow {
  id: string
  event_type: string
  timestamp: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
  channel: string | null
  details: Record<string, unknown> | null
  evidence_url: string | null
}

interface AuditFacets {
  eventTypes: string[]
  tenants: Array<{ tenant_id: string; legal_name: string | null }>
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /audits — Compliance events table with facet selects + CSV export (FRONT.md §6.8 · BACK.md §8.13). */
export default function AuditsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const type   = get('type')
  const tenant = get('tenant')
  const from   = get('from')
  const to     = get('to')

  const events = useApiQuery<Paginated<EventRow>>(
    (signal) => adminApi('/audits', { query: { type, tenant, from, to, page }, signal }),
    [type, tenant, from, to, page],
  )

  const facets = useApiQuery<AuditFacets>(
    (signal) => adminApi('/audits/facets', { signal }),
    [],
  )

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // The export endpoint only accepts Bearer auth in the Authorization header,
  // so a plain <a href> can never authenticate — download via fetch + Blob.
  async function onExport() {
    setExporting(true)
    setExportError(null)
    try {
      const sb = getSupabase()
      const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null
      if (!token) throw new Error('Sesión expirada — volvé a iniciar sesión.')
      const exportUrl = adminApiUrl('/audits/export.csv', {
        type:   type   || undefined,
        tenant: tenant || undefined,
        from:   from   || undefined,
        to:     to     || undefined,
      })
      const res = await fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Error ${res.status} al exportar`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audits-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setExporting(false)
    }
  }

  const hasFilters = type || tenant || from || to

  const columns: Column<EventRow>[] = [
    {
      header: 'Timestamp',
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-fg-muted text-xs font-mono">
          {fmtDateTime(r.timestamp)}
        </span>
      ),
    },
    {
      header: 'Tipo evento',
      cell: (r) => (
        <span className="font-mono text-xs text-fg">{r.event_type}</span>
      ),
    },
    {
      header: 'Agencia',
      cell: (r) => (
        <span className="truncate block max-w-[160px] text-xs text-fg-muted">{r.legal_name ?? '—'}</span>
      ),
    },
    {
      header: 'Deudor',
      cell: (r) => (
        <span className="truncate block max-w-[160px] text-xs">{r.debtor_name ?? '—'}</span>
      ),
    },
    {
      header: 'Canal',
      cell: (r) => (
        <span className="font-mono text-[10px] uppercase tracking-mono-label text-fg-muted">
          {r.channel ?? '—'}
        </span>
      ),
    },
    {
      header: 'Detalles',
      cell: (r) => {
        const full = r.details ? JSON.stringify(r.details) : null
        const truncated = full ? full.slice(0, 120) : '—'
        return (
          <span
            className="text-xs text-fg-muted font-mono max-w-[420px] truncate block"
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
        label="04 · auditoría"
        title="Auditoría"
        description="Eventos de compliance — Habeas Data, Ley 2300, identity y guardrails. Exportable a CSV (máx 50k filas)."
        right={
          <button type="button" className="btn" onClick={onExport} disabled={exporting}>
            {exporting ? 'Descargando…' : 'Export CSV →'}
          </button>
        }
      />

      {exportError && (
        <div className="card p-3 border-bad/40 mb-4">
          <p className="text-sm text-bad">{exportError}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">tipo evento</span>
          <select
            className="input w-56"
            value={type}
            onChange={(e) => setFilters({ type: e.target.value }, { resetPage: true })}
          >
            <option value="">— todos —</option>
            {(facets.data?.eventTypes ?? []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">inmobiliaria</span>
          <select
            className="input w-56"
            value={tenant}
            onChange={(e) => setFilters({ tenant: e.target.value }, { resetPage: true })}
          >
            <option value="">— todas —</option>
            {(facets.data?.tenants ?? []).map((t) => (
              <option key={t.tenant_id} value={t.tenant_id}>
                {t.legal_name ?? t.tenant_id}
              </option>
            ))}
          </select>
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
            onClick={() => setFilters({ type: '', tenant: '', from: '', to: '' }, { resetPage: true })}
          >
            × limpiar
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={events.data?.data}
        getKey={(r) => r.id}
        isLoading={events.isLoading}
        error={events.error}
        emptyTitle="Sin eventos"
        emptyHint="Ajustá los filtros."
      />

      {events.data && (
        <Pagination page={page} total={events.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
      )}
    </div>
  )
}
