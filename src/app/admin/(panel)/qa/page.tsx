'use client'

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'

/* ── Types (match ADMIN-API-CONTRACT.md — QA) ───────────────────────────── */

interface QaStats {
  total_calls: string
  scored_calls: string
  avg_qa_score: string | null
  compliant_count: string
  non_compliant_count: string
}

interface HistogramRow {
  bucket: string // width_bucket(0,100,10) → 1..10
  count: string
}

interface FlagRow {
  flag: string
  count: string
}

interface LowScoreRow {
  id: string
  initiated_at: string
  qa_score: string | null
  debtor_name: string | null
  legal_name: string | null
}

interface QaResponse {
  stats: QaStats | null
  histogram: HistogramRow[]
  topFlags: FlagRow[]
  lowScoreQueue: LowScoreRow[]
}

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function scoreTone(score: string | null): string {
  const n = parseFloat(score ?? '0')
  if (n < 50) return 'bg-bad'
  if (n < 70) return 'bg-warn'
  if (n < 90) return 'bg-brand'
  return 'bg-ok'
}

/** /qa — QA scoring (BACK.md §8.12 · FRONT.md §6.16). 30-day window. */
export default function QaPage() {
  const router = useRouter()

  const qa = useApiQuery<QaResponse>(
    (signal) => adminApi('/qa', { signal }),
    [],
  )

  const stats = qa.data?.stats
  const dist = qa.data?.histogram ?? []
  const flags = qa.data?.topFlags ?? []
  const low = qa.data?.lowScoreQueue ?? []

  const maxBucket = Math.max(1, ...dist.map((d) => num(d.count)))
  const maxFlag = Math.max(1, ...flags.map((f) => num(f.count)))

  const lowColumns: Column<LowScoreRow>[] = [
    {
      header: 'Score',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-bad font-medium">
          {r.qa_score ? Number(r.qa_score).toFixed(0) : '—'}
        </span>
      ),
    },
    {
      header: 'Deudor',
      cell: (r) => (
        <span className="font-medium">{r.debtor_name ?? '—'}</span>
      ),
    },
    {
      header: 'Agencia',
      cell: (r) => <span className="text-fg-muted text-xs truncate">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-xs text-fg-muted">
          {fmtDateTime(r.initiated_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="09 · qa"
        title="Quality scoring."
        description="Distribución, flags y calls que requieren revisión (score < 70). Última 30d."
      />

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Llamadas 30d" value={stats?.total_calls ?? '0'} hint="todas" />
        <KpiCard label="Scoreadas" value={stats?.scored_calls ?? '0'} hint="QaScorer corrió" />
        <KpiCard
          label="Score promedio"
          value={`${num(stats?.avg_qa_score).toFixed(1)} / 100`}
        />
        <KpiCard
          label="Compliant"
          value={stats?.compliant_count ?? '0'}
          tone="ok"
        />
        <KpiCard
          label="No compliant"
          value={stats?.non_compliant_count ?? '0'}
          tone="bad"
        />
      </section>

      {/* ── Histogram + Flags ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 10-bucket score distribution */}
        <div className="card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-4">
            distribución · 10 buckets
          </div>
          {dist.length === 0 ? (
            <div className="text-sm text-fg-muted">Sin calls scoreadas.</div>
          ) : (
            <div className="space-y-2">
              {/* Fill all 10 buckets (1-based, per width_bucket) */}
              {Array.from({ length: 10 }, (_, i) => {
                const bkt = i + 1
                const from = i * 10
                const to = (i + 1) * 10
                const row = dist.find((d) => Number(d.bucket) === bkt)
                const n = row ? num(row.count) : 0
                const pct = (n / maxBucket) * 100
                const barColor =
                  from < 50 ? 'bg-bad' :
                  from < 70 ? 'bg-warn' :
                  from < 90 ? 'bg-brand' :
                               'bg-ok'
                return (
                  <div key={bkt}>
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="font-mono text-fg-muted">{from}–{to}</span>
                      <span className="font-mono tabular-nums">{n}</span>
                    </div>
                    <div className="h-2 bg-bg-hover overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top-12 compliance flags */}
        <div className="card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-4">
            compliance flags · 30d
          </div>
          {flags.length === 0 ? (
            <div className="text-sm text-fg-muted">Sin flags.</div>
          ) : (
            <div className="space-y-2">
              {flags.map((f) => {
                const n = num(f.count)
                const pct = (n / maxFlag) * 100
                return (
                  <div key={f.flag}>
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="font-mono text-fg">{f.flag}</span>
                      <span className="font-mono tabular-nums text-warn">{n}</span>
                    </div>
                    <div className="h-1.5 bg-bg-hover overflow-hidden">
                      <div className="h-full bg-warn" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Low-score queue ─────────────────────────────────────────────── */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        cola de revisión · score &lt; 70 · top 30
      </div>
      <DataTable
        columns={lowColumns}
        rows={low}
        getKey={(r) => r.id}
        isLoading={qa.isLoading}
        error={qa.error}
        emptyTitle="Sin calls debajo del umbral."
        onRowClick={(r) => router.push(`/admin/calls/${r.id}`)}
      />
    </div>
  )
}
