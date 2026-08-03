'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import type { Paginated, PillTone } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { Pill } from '@/components/admin/Pill'

const PAGE_SIZE = 50

// ── Types ──────────────────────────────────────────────────────────────────

interface PaymentKpis {
  approved_count: string
  approved_total: string
  pending_count: string
  declined_count: string
  refunded_count: string
  disbursed_count: string
  disbursed_total: string
  pending_disbursement_count: string
  fees_total: string
}

interface PaymentRow {
  id: string
  amount: string
  status: string
  provider: string | null
  paid_at: string | null
  created_at: string
  disbursement_status: string | null
  disbursed_at: string | null
  fee_amount: string | null
  invoice_cufe: string | null
  debtor_name: string
  legal_name: string | null
}

interface PaymentsResponse extends Paginated<PaymentRow> {
  kpis: PaymentKpis
}

// ── Helpers ────────────────────────────────────────────────────────────────

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function statusTone(s: string): PillTone {
  switch (s) {
    case 'approved': return 'ok'
    case 'pending':  return 'warn'
    case 'declined':
    case 'voided':
    case 'refunded': return 'bad'
    default:         return 'neutral'
  }
}

function DisbursementCell({ status, disbursedAt }: { status: string | null; disbursedAt: string | null }) {
  if (status === 'disbursed') {
    const dateOnly = disbursedAt ? fmtDateTime(disbursedAt).split(',')[0] : ''
    return <span className="text-ok">✓ {dateOnly}</span>
  }
  if (status === 'pending') return <span className="text-warn">pending</span>
  return <span className="text-fg-subtle">—</span>
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /payments — Wompi / Bold payment funnel with KPIs (FRONT.md §6.15 · BACK.md §8.7). */
export default function PaymentsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const status   = get('status')
  const provider = get('provider')

  const result = useApiQuery<PaymentsResponse>(
    (signal) =>
      adminApi('/payments', { query: { status, provider, page }, signal }),
    [status, provider, page],
  )

  const kpis = result.data?.kpis

  const columns: Column<PaymentRow>[] = [
    {
      header: 'Deudor',
      cell: (r) => (
        <span className="font-medium text-fg truncate block max-w-[180px]">{r.debtor_name}</span>
      ),
    },
    {
      header: 'Agencia',
      cell: (r) => (
        <span className="text-fg-muted text-xs truncate block max-w-[160px]">{r.legal_name ?? '—'}</span>
      ),
    },
    {
      header: 'Status',
      cell: (r) => <Pill tone={statusTone(r.status)}>{r.status}</Pill>,
    },
    {
      header: 'Provider',
      cell: (r) => (
        <span className="font-mono text-[11px] uppercase tracking-mono-label text-fg-muted">
          {r.provider ?? '—'}
        </span>
      ),
    },
    {
      header: 'Monto',
      align: 'right',
      cell: (r) => <span className="tabular-nums font-medium">{fmtCOP(num(r.amount))}</span>,
    },
    {
      header: 'Fee',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums text-fg-muted text-xs">
          {r.fee_amount ? fmtCOP(num(r.fee_amount)) : '—'}
        </span>
      ),
    },
    {
      header: 'Desembolso',
      cell: (r) => (
        <span className="text-xs">
          <DisbursementCell status={r.disbursement_status} disbursedAt={r.disbursed_at} />
        </span>
      ),
    },
    {
      header: 'Pagado',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-fg-muted text-xs font-mono">
          {fmtDateTime(r.paid_at ?? r.created_at)}
        </span>
      ),
    },
  ]

  const pendingDisbursementCount = num(kpis?.pending_disbursement_count)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="08 · pagos"
        title="Pagos"
        description="Funnel Wompi / Bold — aprobado, pendiente, declinado, reembolsado y desembolsado. Últimos 30 días."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          tone="ok"
          label="Aprobado · 30d"
          value={result.isLoading ? '—' : fmtCOP(num(kpis?.approved_total))}
          hint={`${kpis?.approved_count ?? 0} transacciones`}
        />
        <KpiCard
          tone="warn"
          label="Pendientes"
          value={result.isLoading ? '—' : (kpis?.pending_count ?? '0')}
          hint="payment.status='pending'"
        />
        <KpiCard
          tone="bad"
          label="Declinados · 30d"
          value={result.isLoading ? '—' : (kpis?.declined_count ?? '0')}
          hint={`${kpis?.refunded_count ?? 0} refunded`}
        />
        <KpiCard
          label="Desembolsado · 30d"
          value={result.isLoading ? '—' : fmtCOP(num(kpis?.disbursed_total))}
          hint={`${kpis?.disbursed_count ?? 0} payouts · fees ${fmtCOP(num(kpis?.fees_total))}`}
        />
      </div>

      {/* Pending disbursement alert */}
      {pendingDisbursementCount > 0 && (
        <div className="card p-3 border-l-4 border-l-warn mb-6">
          <span className="font-mono text-[10px] uppercase tracking-mono-label text-warn">alerta</span>
          <p className="text-sm text-fg mt-1">
            <span className="tabular-nums font-medium">{kpis?.pending_disbursement_count}</span>{' '}
            pago{pendingDisbursementCount === 1 ? '' : 's'} aprobado{pendingDisbursementCount === 1 ? '' : 's'} hace más de 3 días sin desembolsar.
            Revisar el cron daily-dispersion.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">status</span>
          <select
            className="input w-44"
            value={status}
            onChange={(e) => setFilters({ status: e.target.value }, { resetPage: true })}
          >
            <option value="">— todos —</option>
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="declined">declined</option>
            <option value="voided">voided</option>
            <option value="refunded">refunded</option>
          </select>
        </label>
        <label className="block">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-mono-label text-fg-subtle">provider</span>
          <select
            className="input w-36"
            value={provider}
            onChange={(e) => setFilters({ provider: e.target.value }, { resetPage: true })}
          >
            <option value="">— todos —</option>
            <option value="wompi">wompi</option>
            <option value="bold">bold</option>
          </select>
        </label>
        {(status || provider) && (
          <button
            className="btn"
            onClick={() => setFilters({ status: '', provider: '' }, { resetPage: true })}
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
        emptyTitle="Sin pagos"
        emptyHint="Ajustá los filtros."
      />

      {result.data && (
        <Pagination page={page} total={result.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
      )}
    </div>
  )
}
