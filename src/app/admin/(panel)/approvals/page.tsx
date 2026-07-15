'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'

interface PendingRow {
  id: string
  tenant_id: string
  debtor_id: string
  decision_type: string
  // pg NUMERIC arrives as string (::text cast) — convert before math
  confidence_score: string | null
  model_used: string
  created_at: string
  debtor_name: string | null
  legal_name: string | null
  decision_payload: Record<string, unknown>
}

interface ApprovalsResponse {
  data: PendingRow[]
  facets: Array<{ decision_type: string; n: string }>
}

function summarizePayload(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'pre_judicial_letter':
      return `Carta pre-jurídica armada · ${
        (payload.debt_amount_cop as number | undefined)?.toLocaleString('es-CO') ?? '—'
      } COP de deuda`
    case 'siniestro_filing':
      return `Reclamo siniestro · aseguradora ${
        (payload.insurer as string | undefined) ?? '?'
      } · ${
        (payload.debt_amount_cop as number | undefined)?.toLocaleString('es-CO') ?? '—'
      } COP`
    case 'legal_escalation':
      return `Escalación legal · ${
        (payload.target as string | undefined) ?? '?'
      } (${(payload.reason as string | undefined) ?? '—'})`
    default:
      return JSON.stringify(payload).slice(0, 200)
  }
}

function ageTone(createdAt: string): string {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000
  if (days > 3) return 'border-l-bad'
  if (days > 1) return 'border-l-warn'
  return 'border-l-brand'
}

function ApprovalCard({ row }: { row: PendingRow }) {
  const router = useRouter()
  const days = (Date.now() - new Date(row.created_at).getTime()) / 86_400_000
  const summary = summarizePayload(row.decision_type, row.decision_payload)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/admin/approvals/${row.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/approvals/${row.id}`)}
      className={`card border-l-4 ${ageTone(row.created_at)} p-4 flex items-start gap-4 hover:bg-bg-hover transition-colors cursor-pointer`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <Pill tone="info">{row.decision_type}</Pill>
          <span className="font-medium text-fg">{row.debtor_name ?? '—'}</span>
          <span className="text-fg-subtle text-xs font-mono">
            {row.legal_name ?? '(sin agencia)'}
          </span>
        </div>
        <div className="text-sm text-fg-muted leading-snug mb-2">{summary}</div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
          <span className={days > 3 ? 'text-bad' : days > 1 ? 'text-warn' : ''}>
            esperando {days.toFixed(1)}d
          </span>
          <span>
            conf {row.confidence_score != null ? Number(row.confidence_score).toFixed(2) : '—'}
          </span>
          <span>{row.model_used}</span>
          <span className="tabular-nums">{fmtDateTime(row.created_at)}</span>
        </div>
      </div>
      <div className="text-fg-subtle">→</div>
    </div>
  )
}

/** /admin/approvals — T-323/2024 reviewable queue (FRONT.md §6.11 · BACK.md §8.10). */
export default function ApprovalsPage() {
  const { get, setFilters } = useUrlFilters()
  const type = get('type')

  const { data, isLoading, error } = useApiQuery<ApprovalsResponse>(
    (signal) => adminApi('/approvals', { query: { type: type || undefined }, signal }),
    [type],
  )

  const rows = data?.data ?? []
  const facets = data?.facets ?? []
  const totalPending = facets.reduce((a, f) => a + parseInt(f.n, 10), 0)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="aprobaciones"
        title="Cola T-323/2024"
        description="Toda decisión algorítmica con efecto legal pasa por acá antes de ejecutarse."
      />

      {/* Type facets */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilters({ type: undefined })}
          className={`pill ${!type ? 'pill-info' : ''}`}
        >
          todas · {totalPending}
        </button>
        {facets.map((f) => (
          <button
            key={f.decision_type}
            onClick={() => setFilters({ type: f.decision_type })}
            className={`pill ${type === f.decision_type ? 'pill-info' : ''}`}
          >
            {f.decision_type} · {f.n}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        cola · más viejas primero
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : rows.length === 0 ? (
        <EmptyBlock title="Sin decisiones pendientes" hint="La cola está vacía." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <ApprovalCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  )
}
