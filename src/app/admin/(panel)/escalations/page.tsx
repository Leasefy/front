'use client'

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

// Board rows are a slim projection (LIMIT 200, bare array — no pagination
// envelope). Full detail (assignee, resolution, call) lives in /escalations/:id.
interface EscalationRow {
  id: string
  tenant_id: string
  debtor_id: string | null
  status: string
  urgency: string
  created_at: string
  debtor_name: string | null
  legal_name: string | null
}

function urgencyTone(u: string): PillTone {
  if (u === 'live') return 'bad'
  if (u === 'high') return 'warn'
  if (u === 'medium') return 'info'
  return 'muted'
}

function urgencyBorder(u: string): string {
  if (u === 'live') return 'border-l-bad'
  if (u === 'high') return 'border-l-warn'
  if (u === 'medium') return 'border-l-brand'
  return 'border-l-fg-dim'
}

function EscalationCard({ row }: { row: EscalationRow }) {
  const router = useRouter()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/admin/escalations/${row.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/escalations/${row.id}`)}
      className={`card border-l-4 ${urgencyBorder(row.urgency)} p-3 block hover:bg-bg-hover transition-colors cursor-pointer`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <Pill tone={urgencyTone(row.urgency)}>{row.urgency}</Pill>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap">
          {fmtDateTime(row.created_at)}
        </span>
      </div>
      <div className="font-medium text-fg text-sm leading-snug">{row.debtor_name ?? '—'}</div>
      <div className="text-xs text-fg-muted leading-snug truncate">
        {row.legal_name ?? '(sin agencia)'}
      </div>
    </div>
  )
}

function Column({
  title,
  sub,
  count,
  rows,
  muted = false,
}: {
  title: string
  sub: string
  count: number
  rows: EscalationRow[]
  muted?: boolean
}) {
  return (
    <div>
      <div className="mb-3 pb-2 border-b border-bg-border flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-lg text-fg">{title}</h3>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            {sub}
          </div>
        </div>
        <div className="font-mono text-xl tabular-nums text-fg">{count}</div>
      </div>
      {rows.length === 0 ? (
        <div className="card p-5 text-center text-fg-muted text-sm">
          {title === 'Abiertas' ? 'sin abiertas' : 'vacío'}
        </div>
      ) : (
        <div className={`space-y-2 ${muted ? 'opacity-70' : ''}`}>
          {rows.map((r) => (
            <EscalationCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  )
}

/** /admin/escalations — kanban 3 columnas (FRONT.md §6.13 · BACK.md §8.11). */
export default function EscalationsPage() {
  // The board endpoint returns a bare array (LIMIT 200), not a { data } envelope.
  const { data, isLoading, error } = useApiQuery<EscalationRow[]>(
    (signal) => adminApi('/escalations', { signal }),
    [],
  )

  const rows = data ?? []
  const open = rows.filter((r) => r.status === 'open')
  const assigned = rows.filter((r) => r.status === 'assigned')
  const resolved = rows.filter((r) => r.status === 'resolved')

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="escalaciones"
        title="Cola handoff humano"
        description={
          !isLoading && !error
            ? `${open.length} abierta${open.length === 1 ? '' : 's'} · ${assigned.length} en curso · ${resolved.length} resueltas 7d. Ordenado por urgencia.`
            : 'Escalaciones abiertas, en curso y resueltas en los últimos 7 días.'
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Column title="Abiertas" sub="sin asignar" count={open.length} rows={open} />
          <Column title="En curso" sub="asignadas" count={assigned.length} rows={assigned} />
          <Column
            title="Resueltas"
            sub="últimos 7 días"
            count={resolved.length}
            rows={resolved}
            muted
          />
        </div>
      )}
    </div>
  )
}
