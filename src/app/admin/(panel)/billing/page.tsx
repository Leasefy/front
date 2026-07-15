'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'

/* ── Types (match BACK.md §8.8 + monolith billing/page.tsx) ──────────────── */

interface MrrRow {
  tenant_id: string
  legal_name: string
  mrr: string        // COP, current month (billing_events by "timestamp", DEC-2)
  mrr_prev: string   // COP, last full calendar month
}

interface BillingTotals {
  mrr: string        // COP, current month
  mrr_prev: string   // COP, last full calendar month
  arr: string        // COP = mrr_prev × 12
}

interface BillingResponse {
  perTenant: MrrRow[]
  totals: BillingTotals | null
}

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// ── columns ──────────────────────────────────────────────────────────────────

const columns: Column<MrrRow>[] = [
  {
    header: 'Inmobiliaria',
    cell: (r) => <span className="font-medium">{r.legal_name}</span>,
  },
  {
    header: 'MRR mes actual',
    align: 'right',
    cell: (r) => (
      <span className={`tabular-nums font-mono text-sm ${num(r.mrr) > 0 ? 'text-ok' : 'text-fg-muted'}`}>
        {fmtCOP(num(r.mrr))}
      </span>
    ),
  },
  {
    header: 'MRR mes pasado',
    align: 'right',
    cell: (r) => (
      <span className="tabular-nums font-mono text-xs text-fg-muted">
        {fmtCOP(num(r.mrr_prev))}
      </span>
    ),
  },
]

/** /billing — MRR · ARR · por agencia (BACK.md §8.8 · FRONT.md §6.25). LIMIT 100. */
export default function BillingPage() {
  const billing = useApiQuery<BillingResponse>(
    (signal) => adminApi('/billing', { signal }),
    [],
  )

  const rows = billing.data?.perTenant ?? []
  const totals = billing.data?.totals

  const mrrCop = num(totals?.mrr_prev)
  const arrCop = num(totals?.arr)
  const billingCount = rows.filter((r) => num(r.mrr) > 0).length

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="18 · billing"
        title="MRR / ARR / por agencia."
        description="BillingEvent rows agregados. Mes pasado + ARR proyectado."
      />

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <KpiCard
          label="MRR · mes pasado"
          value={fmtCOP(mrrCop)}
          hint="billing_events mes anterior"
          tone="ok"
        />
        <KpiCard
          label="ARR · proyectado"
          value={fmtCOP(arrCop)}
          hint="MRR × 12"
        />
        <KpiCard
          label="Inmobiliarias billing"
          value={`${billingCount} / ${rows.length}`}
          hint="con MRR > 0"
        />
      </section>

      {/* ── Per-agency table (LIMIT 100, no paging) ───────────────────── */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        MRR por inmobiliaria · mes actual vs pasado
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.tenant_id}
        isLoading={billing.isLoading}
        error={billing.error}
        emptyTitle="Sin billing_events."
        emptyHint="No hay eventos de facturación registrados."
      />
    </div>
  )
}
