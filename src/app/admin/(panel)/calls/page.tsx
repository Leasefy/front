'use client'

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import type { Paginated } from '@/lib/admin/types'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { useTenantOptions } from '@/lib/admin/use-tenant-options'
import { fmtDateTime, fmtDuration } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

const PAGE_SIZE = 50

interface CallRow {
  id: string
  initiated_at: string | null
  duration_seconds: number | null
  outcome: string | null
  qa_score: string | null
  recording_url: string | null
  tenant_id: string | null
  debtor_name: string | null
  legal_name: string | null
}

/** Maps a free-form call outcome to a pill tone (heuristic — exact enum lives in the agent). */
function outcomeTone(outcome: string | null): PillTone {
  if (!outcome) return 'muted'
  const o = outcome.toLowerCase()
  if (o.includes('paid') || o.includes('promise') || o.includes('success')) return 'ok'
  if (o.includes('fail') || o.includes('no_answer') || o.includes('refus') || o.includes('declin')) return 'bad'
  if (o.includes('voicemail') || o.includes('busy') || o.includes('callback')) return 'warn'
  return 'neutral'
}

/** /calls — cross-tenant call log (FRONT.md §6.6 · BACK.md §8.4). */
export default function CallsPage() {
  const router = useRouter()
  const { get, page, setFilters, setPage } = useUrlFilters()
  const tenant = get('tenant')
  const outcome = get('outcome')
  const q = get('q')

  const tenants = useTenantOptions()
  const calls = useApiQuery<Paginated<CallRow>>(
    (signal) => adminApi('/calls', { query: { tenant, outcome, q, page }, signal }),
    [tenant, outcome, q, page],
  )

  const columns: Column<CallRow>[] = [
    { header: 'Inicio', cell: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.initiated_at)}</span> },
    { header: 'Agencia', cell: (r) => r.legal_name ?? '—' },
    { header: 'Deudor', cell: (r) => r.debtor_name ?? '—' },
    { header: 'Duración', align: 'right', cell: (r) => <span className="tabular-nums">{fmtDuration(r.duration_seconds)}</span> },
    { header: 'Outcome', cell: (r) => <Pill tone={outcomeTone(r.outcome)}>{r.outcome ?? '—'}</Pill> },
    { header: 'QA', align: 'right', cell: (r) => <span className="tabular-nums">{r.qa_score ?? '—'}</span> },
    { header: 'Rec', align: 'center', cell: (r) => (r.recording_url ? '●' : '○') },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader label="cross-tenant" title="Llamadas" description="Todas las llamadas de todas las agencias." />

      {/* Filters (reflected in the URL) */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">agencia</span>
          <select
            className="input w-56"
            value={tenant}
            onChange={(e) => setFilters({ tenant: e.target.value }, { resetPage: true })}
          >
            <option value="">Todas</option>
            {(tenants.data ?? []).map((t) => (
              <option key={t.tenant_id} value={t.tenant_id}>
                {t.legal_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">outcome</span>
          <input
            className="input w-40"
            value={outcome}
            onChange={(e) => setFilters({ outcome: e.target.value }, { resetPage: true })}
            placeholder="ej. paid"
          />
        </label>
        <label className="block flex-1 min-w-48">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">deudor</span>
          <input
            className="input"
            value={q}
            onChange={(e) => setFilters({ q: e.target.value }, { resetPage: true })}
            placeholder="Buscar por nombre…"
          />
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={calls.data?.data}
        getKey={(r) => r.id}
        isLoading={calls.isLoading}
        error={calls.error}
        emptyTitle="Sin llamadas"
        emptyHint="Ajustá los filtros."
        onRowClick={(r) => router.push(`/admin/calls/${r.id}`)}
      />

      {calls.data && (
        <Pagination page={page} total={calls.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
      )}
    </div>
  )
}
