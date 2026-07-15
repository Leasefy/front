'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'

// ─── Types (match ADMIN-API-CONTRACT.md — Failed states) ───────────────────

/** central_reports / crm_sync_events WHERE status='failed'. */
interface FailedRow {
  id: string
  status: string
  created_at: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
}

/** legal_packages WHERE legal_status='PENDING_RECEIPT' AND issued_at < now-72h. */
interface LegalPackageRow {
  id: string
  legal_status: string
  issued_at: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
}

/** GET /api/v1/admin/failed-states — three buckets, each ≤50 rows. */
interface FailedStatesResponse {
  centralReports: FailedRow[]
  crmSyncEvents: FailedRow[]
  legalPackages: LegalPackageRow[]
}

/** Hours elapsed since an ISO timestamp (client-side; back doesn't send age). */
function ageHours(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 3_600_000) : 0
}

// ─── Column definitions ─────────────────────────────────────────────────────

const centralColumns: Column<FailedRow>[] = [
  {
    header: 'Status',
    cell: (r) => <Pill tone="bad">{r.status}</Pill>,
  },
  {
    header: 'Deudor',
    cell: (r) => <span className="truncate max-w-[200px] block">{r.debtor_name ?? '—'}</span>,
  },
  {
    header: 'Agencia',
    cell: (r) => <span className="text-fg-muted text-xs truncate max-w-[180px] block">{r.legal_name ?? '—'}</span>,
  },
  {
    header: 'Creado',
    align: 'right',
    cell: (r) => <span className="whitespace-nowrap font-mono text-xs text-fg-muted tabular-nums">{fmtDateTime(r.created_at)}</span>,
  },
]

const crmColumns: Column<FailedRow>[] = [
  {
    header: 'Status',
    cell: (r) => <Pill tone="warn">{r.status}</Pill>,
  },
  {
    header: 'Deudor',
    cell: (r) => <span className="truncate max-w-[200px] block">{r.debtor_name ?? '—'}</span>,
  },
  {
    header: 'Agencia',
    cell: (r) => <span className="text-fg-muted text-xs truncate max-w-[180px] block">{r.legal_name ?? '—'}</span>,
  },
  {
    header: 'Creado',
    align: 'right',
    cell: (r) => <span className="whitespace-nowrap font-mono text-xs text-fg-muted tabular-nums">{fmtDateTime(r.created_at)}</span>,
  },
]

const legalColumns: Column<LegalPackageRow>[] = [
  {
    header: 'Status',
    cell: (r) => <Pill tone="bad">{r.legal_status}</Pill>,
  },
  {
    header: 'Deudor',
    cell: (r) => <span className="truncate max-w-[200px] block">{r.debtor_name ?? '—'}</span>,
  },
  {
    header: 'Agencia',
    cell: (r) => <span className="text-fg-muted text-xs truncate max-w-[180px] block">{r.legal_name ?? '—'}</span>,
  },
  {
    header: 'Edad',
    align: 'right',
    cell: (r) => <span className="tabular-nums font-mono text-xs text-bad">{ageHours(r.issued_at)}h</span>,
  },
  {
    header: 'Emitido',
    align: 'right',
    cell: (r) => <span className="whitespace-nowrap font-mono text-xs text-fg-muted tabular-nums">{fmtDateTime(r.issued_at)}</span>,
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────

/** /failed-states — ops inbox (BACK.md §8.17 · FRONT.md §6.20). */
export default function FailedStatesPage() {
  const { data, isLoading, error } = useApiQuery<FailedStatesResponse>(
    (signal) => adminApi('/failed-states', { signal }),
    [],
  )

  const central = data?.centralReports ?? []
  const crm     = data?.crmSyncEvents ?? []
  const legal   = data?.legalPackages ?? []
  const total   = central.length + crm.length + legal.length

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PageHeader
        label="sistema"
        title="Ops inbox"
        description="Fallas operacionales consolidadas: centrales, CRM sync, legal stuck > 72h. Solo lectura."
      />

      {isLoading && <LoadingBlock />}
      {!isLoading && error && <ErrorBlock error={error} />}

      {data && (
        <>
          {/* Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <KpiCard
              label="Centrales failed"
              value={central.length}
              hint="Datacrédito / TransUnion"
              tone={central.length > 0 ? 'bad' : 'ok'}
            />
            <KpiCard
              label="CRM sync failed"
              value={crm.length}
              hint="Wasi / Domus / WebProp / Sinco"
              tone={crm.length > 0 ? 'warn' : 'ok'}
            />
            <KpiCard
              label="Legal stuck > 72h"
              value={legal.length}
              hint="Certicámara PENDING_RECEIPT"
              tone={legal.length > 0 ? 'bad' : 'ok'}
            />
          </div>

          {total === 0 && (
            <div className="card p-8 text-center text-fg-muted text-sm">
              Sin ítems pendientes. Todo OK.
            </div>
          )}

          {/* Centrales */}
          {(central.length > 0 || total === 0) && (
            <section className="mb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
                Centrales failed — Datacrédito / TransUnion
              </div>
              <DataTable
                columns={centralColumns}
                rows={central}
                getKey={(r) => r.id}
                emptyTitle="Sin fallas en centrales"
              />
            </section>
          )}

          {/* CRM */}
          {(crm.length > 0 || total === 0) && (
            <section className="mb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
                CRM sync failed — Wasi / Domus / WebProp / Sinco
              </div>
              <DataTable
                columns={crmColumns}
                rows={crm}
                getKey={(r) => r.id}
                emptyTitle="Sin fallas de sincronización CRM"
              />
            </section>
          )}

          {/* Legal */}
          {(legal.length > 0 || total === 0) && (
            <section className="mb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
                Legal stuck &gt; 72h — Certicámara PENDING_RECEIPT
              </div>
              <DataTable
                columns={legalColumns}
                rows={legal}
                getKey={(r) => r.id}
                emptyTitle="Sin packages atascados"
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}
