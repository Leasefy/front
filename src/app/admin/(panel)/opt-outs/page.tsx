'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { Pill } from '@/components/admin/Pill'

const PAGE_SIZE = 50

// ── Types ──────────────────────────────────────────────────────────────────

interface OptOutStats {
  total: string
  opt_out_invoked: string
  opt_out_request: string
  habeas_data_opt_out: string
}

// Contact PII (document/phone) is deliberately omitted by the back on this
// resource — only names are exposed (ADMIN-API-CONTRACT.md — Opt-outs).
interface OptOutRow {
  id: string
  event_type: string
  timestamp: string
  tenant_id: string
  legal_name: string | null
  debtor_id: string
  debtor_name: string | null
  channel: string | null
  detection: string | null
  matched_phrase: string | null
  call_id: string | null
  opt_out_channels: string[] | null
}

interface OptOutsResponse extends Paginated<OptOutRow> {
  stats: OptOutStats
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /opt-outs — Habeas Data registry (Ley 1581 + Ley 2300). Read-only. (FRONT.md §6.18 · BACK.md §8.16). */
export default function OptOutsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const q = get('q')

  const result = useApiQuery<OptOutsResponse>(
    (signal) => adminApi('/opt-outs', { query: { q, page }, signal }),
    [q, page],
  )

  const stats = result.data?.stats

  const columns: Column<OptOutRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-fg-muted text-xs font-mono">
          {fmtDateTime(r.timestamp)}
        </span>
      ),
    },
    {
      header: 'Deudor',
      cell: (r) => (
        <span className="font-medium text-fg truncate block max-w-[200px]">{r.debtor_name ?? '—'}</span>
      ),
    },
    {
      header: 'Agencia',
      cell: (r) => (
        <span className="text-fg-muted text-xs truncate block max-w-[160px]">{r.legal_name ?? '—'}</span>
      ),
    },
    {
      header: 'Canal',
      cell: (r) => <Pill tone="bad">{r.channel ?? 'voice'}</Pill>,
    },
    {
      header: 'Detección',
      cell: (r) => (
        <span className="text-xs font-mono text-fg-muted">{r.detection ?? '—'}</span>
      ),
    },
    {
      header: 'Frase detectada',
      cell: (r) => (
        <span className="text-xs italic text-fg-muted truncate block max-w-[240px]">
          {r.matched_phrase ? `"${r.matched_phrase}"` : '—'}
        </span>
      ),
    },
    {
      header: 'Canales activos',
      cell: (r) => {
        const channels = r.opt_out_channels ?? []
        if (channels.length === 0) return <span className="text-fg-subtle">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {channels.map((c) => (
              <Pill key={c} tone="bad">{c}</Pill>
            ))}
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="11 · opt-outs"
        title="Opt-outs"
        description="Habeas Data · Ley 1581 + Ley 2300. Registro irrevocable de deudores que invocaron opt-out. Solo lectura."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Opt-outs totales"
          value={result.isLoading ? '—' : (stats?.total ?? '0')}
          hint="vida del sistema"
        />
        <KpiCard
          tone="bad"
          label="Opt-out invocado"
          value={result.isLoading ? '—' : (stats?.opt_out_invoked ?? '0')}
          hint="opt_out_invoked"
        />
        <KpiCard
          tone="warn"
          label="Solicitudes"
          value={result.isLoading ? '—' : (stats?.opt_out_request ?? '0')}
          hint="opt_out_request"
        />
        <KpiCard
          label="Habeas Data"
          value={result.isLoading ? '—' : (stats?.habeas_data_opt_out ?? '0')}
          hint="habeas_data_opt_out"
        />
      </div>

      {/* Search filter */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block flex-1 min-w-64">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">
            búsqueda (nombre del deudor)
          </span>
          <input
            className="input"
            value={q}
            onChange={(e) => setFilters({ q: e.target.value }, { resetPage: true })}
            placeholder="Buscar deudor…"
          />
        </label>
        {q && (
          <button className="btn" onClick={() => setFilters({ q: '' }, { resetPage: true })}>
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
        emptyTitle="Sin opt-outs"
        emptyHint="Ajustá la búsqueda."
      />

      {result.data && (
        <Pagination page={page} total={result.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
      )}

      {/* Legal footnote — always visible */}
      <div className="card p-4 border-l-4 border-l-bad mt-6 text-xs text-fg-muted">
        <span className="font-medium text-fg">Base legal:</span> Ley 1581 de 2012 + Ley 2300 de 2023 (Art. 7).
        El opt-out es <span className="font-medium text-fg">irrevocable</span> sin consentimiento explícito posterior del titular.
        Para revertir: requiere autorización escrita del deudor + sign-off del equipo legal de Leasefy.
        No eliminar registros de aquí sin trazabilidad.
      </div>
    </div>
  )
}
